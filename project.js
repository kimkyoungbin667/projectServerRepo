// 노드 실행을 위한 기본적인 설정
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

//모두 허용
const cors = require('cors');

//일부만 허용 (8080으로 온거만 허용)
const corsOption = {
    origin: 'http://localhost:8080',
    optionSuccessStatus: 200
}

// cors 설정 (corrsOption 정의만큼 허용)
//app.use(cors(corsOption));

app.use(cors());
app.use(express.json())


// 노드메일러 설정
const nodemailer = require('nodemailer');

// DB 설정
const mysql = require('mysql2');
const connection = mysql.createConnection(
    {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '1234',
        database: 'mydb'
    }
);

connection.connect();

// 노드의 기본 포트는 3000임    vue, react도 기본 포트는 3000
app.listen(3000, function () {
    console.log('node start');
});



// ============ 이메일 인증 ============ //

let verificationCodeStore = {};  // 간단한 메모리 저장소로, 이메일과 인증 코드를 저장하는 객체

// 이메일 전송을 위한 Nodemailer 설정
const sendEmail = async (email, code) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'rudqlssla369@gmail.com',
            pass: 'bpxhlhogcwlfephr'
        }
    });

    await transporter.sendMail({
        from: '"칠리마켓" <rudqlssla369@gmail.com>',
        to: email,
        subject: '인증코드를 발신해드립니다!',
        text: `인증코드는 ${code}`,
    });
};

// 이메일로 인증 코드 전송
app.post('/send-code', (req, res) => {

    const email = req.body.email;
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    sendEmail(email, verificationCode)
        .then(() => {
            verificationCodeStore[email] = verificationCode;
            res.json({ success: true });
        })
        .catch(err => {
            console.error('에러', err);
            res.json({ success: false });
        });
});

// 인증 코드 확인
app.post('/verify-code', (req, res) => {
    const { email, code } = req.body;

    if (verificationCodeStore[email] && verificationCodeStore[email].toString() === code) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});



//[Post] 회원가입
app.post('/register', (req, res) => {
    console.log('[Post] 회원가입 실행');
    let data = req.body; //post는 데이터를 body에 넣기때문에 

    // 매너온도, 등급, 가입 일자는 DB에서 default값으로 설정함
    let userId = data.id;
    let userName = data.name;
    let userPw = data.pw;
    let userEmail = data.email;
    let userRegiNum = data.resiNum;
    let userAddress = data.address;
    let userDetailAddress = data.detailAddress;


    connection.query('INSERT INTO userInfo(userId, userName, userPw, userEmail, userAddress, userDetailAddress, userResidentNumber) values(?,?,?,?,?,?,?);',
        [userId, userName, userPw, userEmail, userAddress, userDetailAddress, userRegiNum], (err, rows) => {
            if (err) {
                console.log('오류 : ', err);
            }
        });
});

// [Post] 카카오 회원가입
app.post('/kakaoRegister', (req, res) => {
    console.log('[Post] 카카오 회원가입 실행');
    let data = req.body; // POST 데이터를 body에서 추출

    // 회원 정보 추출
    let userId = data.id;
    let userName = data.name;
    let userEmail = data.email;
    let userRegiNum = data.resiNum;
    let userAddress = data.address;
    let userDetailAddress = data.detailAddress;

    // 회원 정보를 DB에 삽입
    connection.query(
        'INSERT INTO kakaouserinfo(userId, userName, userEmail, userResidentNumber, userAddress, userDetailAddress) values(?,?,?,?,?,?);',
        [userId, userName, userEmail, userRegiNum, userAddress, userDetailAddress],
        (err, rows) => {
            if (err) {
                console.log('오류 : ', err);
                // 클라이언트에 오류 응답을 전송
                res.status(500).json({ success: false, message: '회원가입 중 오류 발생' });
            } else {
                // 클라이언트에 성공 응답을 전송
                res.json({ success: true, message: '회원가입 성공' });
            }
        }
    );
});



//[Post] 아이디 중복체크
app.post('/checkId', (req, res) => {
    console.log('[Post] 중복체크 실행');
    let data = req.body; //post는 데이터를 body에 넣기때문에 

    let userId = data.userId;

    connection.query(
        'SELECT EXISTS (SELECT 1 FROM userInfo WHERE userId = ?) AS idExists',
        [userId],
        (err, results) => {
            if (err) {
                console.error('DB 오류:', err);
                return res.status(500).json({ exists: false });
            }

            const exists = results[0].idExists === 1;
            res.json({ exists });
        }
    );

});

//[Post] 카카오 아이디 있는지 확인
app.post('/checkKakaoEmail', (req, res) => {
    console.log('[Post] 카카오 아아디 있는지 체크');
    let data = req.body; // post 요청 데이터는 body에 들어 있음

    let kakaoEmail = data.kakaoEmail;
    console.log(kakaoEmail);

    connection.query(
        'SELECT EXISTS (SELECT 1 FROM kakaoUserInfo WHERE userEmail = ?) AS idExists',
        [kakaoEmail],
        (err, results) => {
            if (err) {
                console.error('DB 오류:', err);
                return res.status(500).json({ exists: false });
            }
            const exists = results[0].idExists === 1;
            res.json({ exists });  // 결과를 클라이언트로 보냄
        }
    );
});


//[Post] 로그인하기
app.post('/goLogin', (req, res) => {
    let data = req.body;

    let userId = data.id;
    let userPw = data.pw;

    connection.query(
        'SELECT userPw FROM userInfo WHERE userId = ?',
        [userId],
        (err, results) => {
            if (err) {
                console.error('DB 오류:', err);
                return res.status(500).json({ success: false, message: 'DB 오류 발생' });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: '아이디가 존재하지 않습니다.' });
            }

            const storedPw = results[0].userPw;
            if (storedPw === userPw) {
                return res.status(200).json({ success: true, message: '로그인 성공' });
            } else {
                return res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
            }
        }
    );
});

////////////////////////////////////////////////성열안//////////////////////////////////////////////////////

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../projectRepository/chil/uploads/'); // 업로드된 파일을 저장할 디렉토리
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // 파일명을 고유하게 설정
    }
});

const uploadDir = path.join(__dirname, '../projectRepository/chil/uploads/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 업로드 설정된 multer 객체
const upload = multer({ storage: storage });

connection.connect((err) => {
    if (err) {
        console.error('MySQL 연결 오류: ', err);
        process.exit(1); // 연결 오류 시 프로세스 종료
    }
    console.log('MySQL에 성공적으로 연결되었습니다.');
});


// POST 요청 처리 - 주소 저장
app.post('/add-address', (req, res) => {
    const { address, latitude, longitude } = req.body;

    if (!address || !latitude || !longitude) {
        return res.status(400).send('주소와 좌표를 모두 입력해주세요.');
    }

    // 데이터베이스에 삽입하는 SQL 쿼리
    const query = 'INSERT INTO addresses (address, latitude, longitude) VALUES (?, ?, ?)';
    connection.query(query, [address, latitude, longitude], (err, results) => {
        if (err) {
            console.error('데이터 삽입 오류: ', err);
            res.status(500).send('데이터베이스 오류가 발생했습니다.');
        } else {
            res.send('주소가 성공적으로 추가되었습니다.');
        }
    });
});

// GET 요청 처리 - 특정 id의 상품 정보 조회
app.get('/address/:id', (req, res) => {
    const id = req.params.id;
    console.log(`받은 id: ${id}`); // 받은 id 확인 로그

    // usedgoodsboard 테이블에서 해당 상품의 정보를 조회하는 쿼리
    const query = `
        SELECT goodsBoardId, userId, goodsBoardTitle, goodsBoardContent, goodsPrice, 
               goodsCategoryId, goodsBoardWritingDate, isSoldOut, sellLocation, 
               viewCount, goodsPhotoUrl, latitude, longitude 
        FROM mydb.usedgoodsboard 
        WHERE goodsBoardId = ?
    `;

    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('데이터 조회 오류: ', err);
            res.status(500).send('데이터베이스 오류가 발생했습니다.');
        } else {
            if (results.length > 0) {
                console.log('조회된 상품 데이터:', results[0]); // 조회된 데이터 로그
                res.json(results[0]); // 결과를 클라이언트에 반환
            } else {
                console.error('해당 ID의 상품을 찾을 수 없습니다.');
                res.status(404).send('해당 ID의 상품을 찾을 수 없습니다.');
            }
        }
    });
});


app.get('/addresses', (req, res) => {
    const query = 'SELECT address, latitude, longitude FROM addresses';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('데이터 조회 오류: ', err);
            res.status(500).send('데이터베이스 오류가 발생했습니다.');
        } else {
            res.json(results);
        }
    });
});

// 질문 제출 API (POST 방식)
app.post('/submit-question', (req, res) => {
    const { userId, questionTitle, questionContent } = req.body;

    // 질문을 데이터베이스에 삽입하는 SQL 쿼리
    const sql = `INSERT INTO question (userId, questionTitle, questionContent, questionDate) VALUES (?, ?, ?, NOW())`;
    connection.query(sql, [userId, questionTitle, questionContent], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('질문 등록 중 오류가 발생했습니다.');
            return;
        }
        res.status(200).send('질문이 성공적으로 등록되었습니다.');
    });
});

// 질문 목록 가져오기 API (GET 방식)
app.get('/questions', (req, res) => {
    const sql = `
        SELECT q.questionId, u.userName, q.questionTitle, q.questionContent, q.questionDate
        FROM question q
        JOIN userinfo u ON q.userId = u.userId
        ORDER BY q.questionDate DESC
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('질문 목록을 가져오는 중 오류가 발생했습니다.');
            return;
        }
        res.status(200).json(results);
    });
});

// POST 요청 처리 - 사용자 신고
app.post('/report-user', (req, res) => {
    const { userId, reportedUserId, reportContent } = req.body;

    if (!userId || !reportedUserId || !reportContent) {
        return res.status(400).send('신고자 ID, 피신고자 ID, 신고 내용을 모두 입력해주세요.');
    }

    // 신고 데이터를 데이터베이스에 삽입하는 SQL 쿼리
    const query = 'INSERT INTO fraudreport (userId, reportedUserId, reportContent) VALUES (?, ?, ?)';
    connection.query(query, [userId, reportedUserId, reportContent], (err, results) => {
        if (err) {
            console.error('데이터 삽입 오류: ', err);
            res.status(500).send('데이터베이스 오류가 발생했습니다.');
        } else {
            res.send('신고가 성공적으로 접수되었습니다.');
        }
    });
});

// 신고 내역 가져오기 API (GET 방식)
app.get('/reports', (req, res) => {
    const sql = `
        SELECT fr.reportId, u1.userName AS reporterName, u2.userName AS reportedName, fr.reportContent
        FROM fraudreport fr
        JOIN userinfo u1 ON fr.userId = u1.userId
        JOIN userinfo u2 ON fr.reportedUserId = u2.userId
        ORDER BY fr.reportId DESC
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('신고 내역 조회 중 오류가 발생했습니다: ', err);
            res.status(500).send('신고 내역을 가져오는 중 오류가 발생했습니다.');
        } else {
            res.status(200).json(results); // JSON 형식으로 응답
        }
    });
});

app.get('/used-goods', (req, res) => {
    const searchQuery = req.query.search;
    const categories = req.query.categories;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const limit = parseInt(req.query.limit) || 12; // 한 페이지당 표시할 상품 수
    const offset = parseInt(req.query.offset) || 0; // 시작 지점

    let sql = `
        SELECT u.userName, u.userLocation, g.goodsBoardId, g.goodsBoardTitle, g.goodsBoardContent, g.goodsPrice, g.goodsBoardWritingDate, g.isSoldOut, g.sellLocation, g.goodsCategoryId, g.viewCount, g.goodsPhotoUrl
        FROM usedgoodsboard g
        JOIN userinfo u ON g.userId = u.userId
    `;

    let countSql = `SELECT COUNT(*) as totalCount FROM usedgoodsboard g JOIN userinfo u ON g.userId = u.userId`;

    const queryParams = [];
    const countParams = [];

    if (searchQuery) {
        sql += ` WHERE (g.goodsBoardTitle LIKE ? OR g.sellLocation LIKE ?) `;
        countSql += ` WHERE (g.goodsBoardTitle LIKE ? OR g.sellLocation LIKE ?) `;
        queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
        countParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (categories) {
        const categoryList = categories.split(',').map(cat => `'${cat}'`).join(',');
        sql += searchQuery ? ` AND ` : ` WHERE `;
        countSql += searchQuery ? ` AND ` : ` WHERE `;
        sql += ` g.goodsCategoryId IN (${categoryList}) `;
        countSql += ` g.goodsCategoryId IN (${categoryList}) `;
    }

    if (minPrice) {
        sql += searchQuery || categories ? ` AND ` : ` WHERE `;
        countSql += searchQuery || categories ? ` AND ` : ` WHERE `;
        sql += ` g.goodsPrice >= ? `;
        countSql += ` g.goodsPrice >= ? `;
        queryParams.push(minPrice);
        countParams.push(minPrice);
    }

    if (maxPrice) {
        sql += searchQuery || categories || minPrice ? ` AND ` : ` WHERE `;
        countSql += searchQuery || categories || minPrice ? ` AND ` : ` WHERE `;
        sql += ` g.goodsPrice <= ? `;
        countSql += ` g.goodsPrice <= ? `;
        queryParams.push(maxPrice);
        countParams.push(maxPrice);
    }

    sql += ` ORDER BY g.viewCount DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    connection.query(sql, queryParams, (err, results) => {
        if (err) {
            console.error('상품 목록 조회 중 오류가 발생했습니다: ', err);
            res.status(500).send('상품 목록을 가져오는 중 오류가 발생했습니다.');
        } else {
            // 총 상품 수 계산
            connection.query(countSql, countParams, (countErr, countResult) => {
                if (countErr) {
                    console.error('상품 개수 조회 중 오류가 발생했습니다: ', countErr);
                    res.status(500).send('상품 개수를 가져오는 중 오류가 발생했습니다.');
                } else {
                    const totalCount = countResult[0].totalCount;
                    res.status(200).json({ goods: results, totalCount }); // 상품과 총 상품 수를 함께 응답
                }
            });
        }
    });
});



function applyCategoryFilter() {
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked'))
        .map(checkbox => checkbox.value);

    console.log('선택된 카테고리:', selectedCategories); // 선택된 카테고리 출력

    loadGoods('', selectedCategories);
}

app.get('/used-goods/random', (req, res) => {
    let sql = `
        SELECT u.userName, u.userLocation, g.goodsBoardId, g.goodsBoardTitle, g.goodsBoardContent, g.goodsPrice, g.goodsBoardWritingDate, g.isSoldOut, g.sellLocation, g.goodsPhotoUrl
        FROM usedgoodsboard g
        JOIN userinfo u ON g.userId = u.userId
        ORDER BY RAND() 
        LIMIT 1
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('랜덤 상품 목록 조회 중 오류가 발생했습니다: ', err);
            res.status(500).send('랜덤 상품 목록을 가져오는 중 오류가 발생했습니다.');
        } else {
            console.log(results); // 서버에서 결과 확인
            res.status(200).json(results);
        }
    });
});

app.get('/used-goods/:id', (req, res) => {
    const goodsBoardId = req.params.id;

    console.log('요청된 goodsBoardId:', goodsBoardId);  // 디버깅 로그 추가

    const updateViewCountQuery = `UPDATE usedgoodsboard SET viewCount = viewCount + 1 WHERE goodsBoardId = ?`;

    connection.query(updateViewCountQuery, [goodsBoardId], (err, results) => {
        if (err) {
            console.error('조회수 업데이트 중 오류 발생:', err);
            return res.status(500).json({ error: '조회수 업데이트 중 오류 발생' });
        }

        const selectGoodsQuery = `SELECT * FROM usedgoodsboard WHERE goodsBoardId = ?`;

        connection.query(selectGoodsQuery, [goodsBoardId], (err, goods) => {
            if (err) {
                console.error('상품 정보 조회 중 오류 발생:', err);
                return res.status(500).json({ error: '상품 정보 조회 중 오류 발생' });
            }

            if (goods.length > 0) {
                console.log('상품 정보:', goods[0]);  // 디버깅용 로그
                res.json(goods[0]); // 상품 정보 응답
            } else {
                console.error('해당 상품을 찾을 수 없습니다. goodsBoardId:', goodsBoardId);
                res.status(404).json({ error: '해당 상품을 찾을 수 없습니다.' });
            }
        });
    });
});


app.get('/popular-searches', (req, res) => {
    const sql = `
        SELECT searchQuery, searchCount
        FROM search_log
        ORDER BY searchCount DESC
        LIMIT 10
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('인기 검색어 조회 중 오류가 발생했습니다: ', err);
            res.status(500).send('인기 검색어를 가져오는 중 오류가 발생했습니다.');
        } else {
            console.log('인기 검색어:', results); // 서버에서 로그 출력
            res.status(200).json(results);
        }
    });
});

app.get('/used-goods/category/:goodsCategoryId', (req, res) => {
    const categoryId = req.params.goodsCategoryId;
    console.log('Category ID:', categoryId); // 로그 추가
    const query = `SELECT * FROM usedgoodsboard WHERE goodsCategoryId = ?`;
    connection.query(query, [categoryId], (error, results) => {
        if (error) {
            console.error('Error fetching category goods:', error);
            return res.status(500).send('Error fetching category goods');
        }
        console.log('Fetched goods:', results); // 쿼리 결과 로그
        res.json(results);
    });
});

// 로그인 API
app.post('/login', (req, res) => {
    const { userName, userPw } = req.body;

    // 입력된 userName과 userPw로 데이터베이스에서 사용자 확인
    const query = 'SELECT * FROM userinfo WHERE userName = ? AND userPw = ?';
    connection.query(query, [userName, userPw], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: '잘못된 사용자명 또는 비밀번호입니다.' });
        }

        // 로그인 성공 시 응답
        return res.status(200).json({ message: '로그인 성공', userId: results[0].userId });
    });
});

app.post('/like', (req, res) => {
    const { userId, goodsBoardId } = req.body;

    // 사용자가 이미 찜한 상품인지 확인
    const checkLikeQuery = `SELECT * FROM liketable WHERE userId = ? AND goodsBoardId = ?`;
    connection.query(checkLikeQuery, [userId, goodsBoardId], (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Database error' });
        }

        if (result.length > 0) {
            // 이미 찜한 경우, 찜을 취소
            const deleteLikeQuery = `DELETE FROM liketable WHERE userId = ? AND goodsBoardId = ?`;
            connection.query(deleteLikeQuery, [userId, goodsBoardId], (err, result) => {
                if (err) {
                    return res.status(500).send({ error: 'Database error' });
                }
                res.send({ success: false });
            });
        } else {
            // 찜하지 않은 경우, 찜 추가
            const insertLikeQuery = `INSERT INTO liketable (userId, goodsBoardId) VALUES (?, ?)`;
            connection.query(insertLikeQuery, [userId, goodsBoardId], (err, result) => {
                if (err) {
                    return res.status(500).send({ error: 'Database error' });
                }
                res.send({ success: true });
            });
        }
    });
});

app.get('/liked-goods/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT g.goodsBoardId, g.goodsBoardTitle, g.goodsBoardContent, g.goodsPrice, g.goodsBoardWritingDate, g.isSoldOut, g.sellLocation, g.viewCount
        FROM liketable l
        JOIN usedgoodsboard g ON l.goodsBoardId = g.goodsBoardId
        WHERE l.userId = ?
    `;

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('찜한 상품 목록 조회 중 오류 발생: ', err);
            res.status(500).send('찜한 상품 목록을 불러오는 중 오류가 발생했습니다.');
        } else {
            res.status(200).json(results);
        }
    });
});

// 제품 추가 라우트
app.post('/add-goods', upload.single('goodsPhoto'), (req, res) => {
    const { userId, goodsTitle, goodsContent, goodsPrice, goodsCategory, sellLocation, latitude, longitude, goodsBoardWritingDate } = req.body;
    const goodsPhotoUrl = `./uploads/${req.file.filename}`; // 업로드된 파일 경로

    // MySQL 쿼리로 데이터베이스에 삽입
    const query = `INSERT INTO usedgoodsboard 
      (userId, goodsBoardTitle, goodsBoardContent, goodsPrice, goodsCategoryId, sellLocation, latitude, longitude, goodsPhotoUrl, goodsBoardWritingDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // MySQL 연결을 통해 쿼리 실행
    connection.query(query, [userId, goodsTitle, goodsContent, goodsPrice, goodsCategory, sellLocation, latitude, longitude, goodsPhotoUrl, goodsBoardWritingDate], (err, result) => {
        if (err) {
            console.error('상품 추가 중 오류:', err);
            return res.status(500).json({ success: false, message: '상품 추가 중 오류 발생' });
        }
        res.json({ success: true, message: '상품이 성공적으로 등록되었습니다!' });
    });
});

app.get('/categories', (req, res) => {
    const query = `
        SELECT c.categoryId, c.categoryName, COUNT(ug.goodsCategoryId) AS productCount
        FROM Category c
        LEFT JOIN usedgoodsboard ug ON c.categoryId = ug.goodsCategoryId
        GROUP BY c.categoryId, c.categoryName;
    `;
    connection.query(query, (err, results) => {
        if (err) throw err;
        res.json(results); // 반드시 JSON 응답 반환
    });
});

// (백엔드) 사용된 카테고리 반환 API 예시
app.get('/used-goods/categories', (req, res) => {
    const searchQuery = req.query.search || '';
    const categories = req.query.categories || [];

    // 검색어와 선택된 카테고리에 따른 상품을 조회하고, 해당 상품들의 카테고리만 반환
    const query = `
      SELECT DISTINCT c.categoryId, c.categoryName, COUNT(p.goodsBoardId) AS productCount
      FROM usedgoodsboard p
      JOIN Category c ON p.goodsCategoryId = c.categoryId
      WHERE (p.goodsBoardTitle LIKE ? OR ? = '')
      AND (p.goodsCategoryId IN (?) OR ? = '')
      GROUP BY c.categoryId;
    `;

    connection.query(query, [`%${searchQuery}%`, searchQuery, categories, categories], (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching categories');
        }
        res.json(results);
    });
});
