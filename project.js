// 노드 실행을 위한 기본적인 설정
const express = require('express');
const app = express();
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // 암호화 내장 모듈
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


// CORS 설정 (클라이언트 도메인 허용)
app.use(cors({
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

// DB 설정
const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'mydb'
});

connection.connect();

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
                return res.status(200).json({ success: false, message: '아이디가 존재하지 않습니다.' });  // 401 대신 200으로 처리
            }

            const storedPw = results[0].userPw;
            if (storedPw === userPw) {
                return res.status(200).json({ success: true, message: '로그인 성공' });
            } else {
                return res.status(200).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });  // 401 대신 200으로 처리
            }
        }
    );
});
// Nodemailer로 임시 비밀번호 전송 함수
const sendTemporaryPassword = async (email, tempPassword) => {
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
        subject: '임시 비밀번호 안내',
        text: `안녕하세요,\n\n임시 비밀번호는 다음과 같습니다: ${tempPassword}\n로그인 후 비밀번호를 변경해 주세요.\n\n감사합니다.`,
    });
};

// 서버 전역에 인증 코드를 저장할 객체
let verificationCodeStore = {};  // key: email, value: verification code

// 이메일로 인증 코드 전송
app.post('/send-code', (req, res) => {
    const email = req.body.email;
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // 인증 코드를 메모리 내 저장소에 저장
    verificationCodeStore[email] = verificationCode;

    sendEmail(email, verificationCode)
        .then(() => {
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

    // 서버에 저장된 인증 코드와 클라이언트에서 받은 코드를 비교
    if (verificationCodeStore[email] && verificationCodeStore[email].toString() === code) {
        console.log('인증 코드가 일치합니다.');
        res.json({ success: true });
    } else {
        console.log('인증 코드가 일치하지 않습니다.');
        res.status(400).json({ success: false, message: '인증 코드가 일치하지 않습니다.' });
    }
});

// 회원가입 처리
app.post('/register', (req, res) => {
    console.log('[Post] 회원가입 실행');
    let data = req.body;

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
                return res.status(500).json({ success: false, message: 'DB 오류 발생' });
            }
            res.json({ success: true });
        });
});

// [Post] 카카오 회원가입
app.post('/kakaoRegister', (req, res) => {
    console.log('[Post] 카카오 회원가입 실행');
    let data = req.body;

    let userId = data.id;
    let userName = data.name;
    let userEmail = data.email;
    let userRegiNum = data.resiNum;
    let userAddress = data.address;
    let userDetailAddress = data.detailAddress;

    connection.query('INSERT INTO kakaouserinfo(userId, userName, userEmail, userResidentNumber, userAddress, userDetailAddress) values(?,?,?,?,?,?);',
        [userId, userName, userEmail, userRegiNum, userAddress, userDetailAddress], (err, rows) => {
            if (err) {
                console.log('오류 : ', err);
                return res.status(500).json({ success: false, message: '회원가입 중 오류 발생' });
            }
            res.json({ success: true, message: '회원가입 성공' });
        });
});

// 아이디 중복 체크
app.post('/checkId', (req, res) => {
    console.log('[Post] 아이디 중복체크 실행');
    let userId = req.body.userId;

    connection.query('SELECT EXISTS (SELECT 1 FROM userInfo WHERE userId = ?) AS idExists', [userId], (err, results) => {
        if (err) {
            console.error('DB 오류:', err);
            return res.status(500).json({ exists: false });
        }
        const exists = results[0].idExists === 1;
        res.json({ exists });
    });
});

// 이메일 중복 체크
app.post('/checkEmailDupli', (req, res) => {
    console.log('[Post] 이메일 중복체크 실행');
    let userEmail = req.body.email;

    connection.query('SELECT EXISTS (SELECT 1 FROM userInfo WHERE userEmail = ?) AS idExists', [userEmail], (err, results) => {
        if (err) {
            console.error('DB 오류:', err);
            return res.status(500).json({ exists: false });
        }
        const exists = results[0].idExists === 1;
        res.json({ exists });
    });
});

// 비밀번호 찾기
app.post('/findPw', (req, res) => {
    console.log('비밀번호 찾기');
    let data = req.body;
    let userId = data.userId;
    let email = data.email;

    connection.query('SELECT userEmail FROM userInfo WHERE userId = ?', [userId], (err, results) => {
        if (err) {
            console.error('DB 오류:', err);
            return res.status(500).json({ success: false, message: 'DB 오류 발생' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: '아이디가 존재하지 않습니다.' });
        }

        const storedEmail = results[0].userEmail;
        if (storedEmail === email) {
            const temporaryPassword = crypto.randomBytes(4).toString('hex');
            const hashedPassword = crypto.createHash('sha256').update(temporaryPassword).digest('hex');

            connection.query('UPDATE userInfo SET userPw = ? WHERE userId = ?', [temporaryPassword, userId], (err, updateResult) => {
                if (err) {
                    console.error('DB 오류:', err);
                    return res.status(500).json({ success: false, message: '비밀번호 업데이트 오류 발생' });
                }

                sendTemporaryPassword(email, temporaryPassword)
                    .then(() => {
                        console.log(`임시 비밀번호: ${temporaryPassword}`);
                        return res.status(200).json({ success: true, message: '임시 비밀번호가 이메일로 전송되었습니다.' });
                    })
                    .catch(err => {
                        console.error('이메일 전송 오류:', err);
                        return res.status(500).json({ success: false, message: '이메일 전송 실패' });
                    });
            });
        } else {
            return res.status(401).json({ success: false, message: '인증했던 이메일이 일치하지 않습니다.' });
        }
    });
});

// Socket.io 설정
const server = http.createServer(app);


// Socket.io 설정
const inputOutput = socketIo(server, {
    cors: {
        origin: "http://127.0.0.1:5500", // 클라이언트가 실행 중인 주소
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.io 연결 처리
inputOutput.on('connection', (socket) => {
    console.log('클라이언트 연결됨:', socket.id);

    // 클라이언트가 채팅방에 입장
    socket.on('joinRoom', (chatRoomId, goodsBoardId, buyerId, sellerId) => {
        // 먼저 채팅방이 존재하는지 확인
        console.log(goodsBoardId);
        console.log(buyerId);
        console.log(sellerId);

        connection.query('SELECT * FROM chatRoom WHERE chatRoomId = ?', [chatRoomId], (err, results) => {
            if (err) {
                console.error('채팅방 확인 오류:', err);
                socket.emit('error', { message: '채팅방 확인 오류', error: err });
                return;
            }

            if (results.length === 0) {
                // 채팅방이 없으면 생성
                connection.query(
                    'INSERT INTO chatRoom (goodsBoardId, goodsBuyerId, sellerId) VALUES (?, ?, ?)',
                    [goodsBoardId, buyerId, sellerId],
                    (err, result) => {
                        if (err) {
                            console.error('채팅방 생성 오류:', err);
                            socket.emit('error', { message: '채팅방 생성 오류', error: err });
                            return;
                        }

                        const newChatRoomId = result.insertId;
                        socket.join(newChatRoomId);  // 새로운 채팅방에 join
                        console.log(`새로운 채팅방 ${newChatRoomId} 생성 및 입장`);

                        // 방 입장 성공 메시지를 클라이언트에게 전송
                        socket.emit('roomJoined', { success: true, chatRoomId: newChatRoomId });
                    }
                );
            } else {
                // 기존 방이 있을 경우 입장
                socket.join(chatRoomId);  // 기존 채팅방에 join
                console.log(`기존 채팅방 ${chatRoomId}에 입장`);
                socket.emit('roomJoined', { success: true, chatRoomId });
            }
        });
    });

    // 클라이언트가 메시지 전송
    socket.on('sendMessage', (data) => {
        const { chatRoomId, senderId, message } = data;

        // 채팅방이 존재하는지 확인 후 메시지 저장
        connection.query('SELECT * FROM chatRoom WHERE chatRoomId = ?', [chatRoomId], (err, results) => {
            if (err) {
                console.error('채팅방 확인 오류:', err);
                socket.emit('error', { message: '채팅방 확인 오류', error: err });
                return;
            }

            if (results.length === 0) {
                console.error(`채팅방 ${chatRoomId}이 존재하지 않습니다.`);
                socket.emit('error', { message: '해당 채팅방이 존재하지 않습니다.' });
                return;
            }

            // 메시지를 DB에 저장
            connection.query(
                'INSERT INTO chatMessage (chatRoomId, sender_id, message) VALUES (?, ?, ?)',
                [chatRoomId, senderId, message],
                (err, result) => {
                    if (err) {
                        console.error('메시지 저장 오류:', err);
                        socket.emit('error', { message: '메시지 저장 오류', error: err });
                        return;
                    }

                    // 저장된 메시지를 같은 채팅방에 있는 모든 클라이언트에게 전송
                    inputOutput.to(chatRoomId).emit('receiveMessage', {
                        senderId,
                        message,
                        messageTime: new Date()  // 현재 시간
                    });

                    // 메시지를 보낸 클라이언트에게 성공 메시지 전송
                    socket.emit('messageSent', { success: true, message });
                }
            );
        });
    });

    // 클라이언트 연결 종료 처리
    socket.on('disconnect', () => {
        console.log(`클라이언트 ${socket.id} 연결 종료`);
    });
});



app.post('/chat/create-room', (req, res) => {
    const { goodsBoardId, sellerId, buyerId } = req.body;

    // 새로운 채팅방 생성
    const query = `
        INSERT INTO chatRoom (goodsBoardId, sellerId, goodsBuyerId) 
        VALUES (?, ?, ?)`;

    connection.query(query, [goodsBoardId, sellerId, buyerId], (err, results) => {
        if (err) {
            console.error('Error creating chat room:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ chatRoomId: results.insertId });
    });
});


app.get('/chat/get-chat-room-id', (req, res) => {
    const { goodsBoardId, userId } = req.query;

    console.log('게시글번호', goodsBoardId);
    console.log('유저아이디', userId);
    // DB에서 해당 채팅방을 검색
    connection.query(
        'SELECT chatRoomId FROM chatRoom WHERE goodsBoardId = ? AND (goodsBuyerId = ? OR sellerId = ?)',
        [goodsBoardId, userId, userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'DB 오류 발생' });
            }

            if (results.length > 0) {
                return res.json({ chatRoomId: results[0].chatRoomId });
            } else {
                return res.status(404).json({ message: '채팅방이 존재하지 않습니다.' });
            }
        }
    );
});


app.get('/chat/room/:chatRoomId/messages', (req, res) => {
    const { chatRoomId } = req.params;

    // DB에서 해당 채팅방의 메시지를 검색
    connection.query(
        'SELECT * FROM chatMessage WHERE chatRoomId = ?',
        [chatRoomId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'DB 오류 발생' });
            }

            return res.json(results);
        }
    );
});


// 채팅방 생성
app.post('/createChatRoom', (req, res) => {
    const { goodsBoardId, buyerId, sellerId } = req.body;

    console.log(goodsBoardId);
    console.log(buyerId);
    console.log(sellerId);
    // 기존에 같은 판매자와 구매자, 그리고 해당 상품에 대한 채팅방이 있는지 확인 (판매 완료되지 않은 경우)
    connection.query(
        `SELECT * FROM chatRoom 
         WHERE goodsBoardId = ? AND goodsBuyerId = ? AND sellerId = ? AND isSoldOut = FALSE`,
        [goodsBoardId, buyerId, sellerId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'DB 오류 발생' });
            }

            if (results.length > 0) {
                // 이미 존재하는 채팅방이 있을 경우 해당 채팅방 정보 반환
                return res.status(200).json({ success: true, chatRoomId: results[0].chatRoomId, message: '기존 채팅방이 있습니다.' });
            } else {
                // 존재하지 않는 경우 새로운 채팅방 생성
                connection.query(
                    'INSERT INTO chatRoom (goodsBoardId, goodsBuyerId, sellerId) VALUES (?, ?, ?)',
                    [goodsBoardId, buyerId, sellerId],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: '채팅방 생성 오류' });
                        }

                        res.status(200).json({ success: true, chatRoomId: result.insertId, message: '새 채팅방이 생성되었습니다.' });
                    }
                );
            }
        }
    );
});

// 서버 실행
server.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
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

const uploadDir = path.join(__dirname, "../../realCloneFiles/projectRepository/chil/uploads/");
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

// GET 요청 처리 - 특정 id의 주소 조회
app.get('/address/:id', (req, res) => {
    const id = req.params.id;
    const query = 'SELECT address, latitude, longitude FROM addresses WHERE id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('데이터 조회 오류: ', err);
            res.status(500).send('데이터베이스 오류가 발생했습니다.');
        } else {
            if (results.length > 0) {
                res.json(results[0]);
            } else {
                res.status(404).send('해당 ID의 주소를 찾을 수 없습니다.');
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

    // 판매 완료되지 않은(isSoldOut = false) 상품만 가져오도록 수정
    let sql = `
        SELECT u.userId, u.userName, u.userLocation, g.goodsBoardId, g.goodsBoardTitle, g.goodsBoardContent, 
               g.goodsPrice, g.goodsBoardWritingDate, g.isSoldOut, g.sellLocation, g.categoryId, g.viewCount, g.goodsPhotoUrl
        FROM usedgoodsboard g
        JOIN userinfo u ON g.userId = u.userId
        WHERE g.isSoldOut = FALSE
    `;

    let countSql = `SELECT COUNT(*) as totalCount FROM usedgoodsboard g JOIN userinfo u ON g.userId = u.userId WHERE g.isSoldOut = FALSE`;

    const queryParams = [];
    const countParams = [];

    if (searchQuery) {
        sql += ` AND (g.goodsBoardTitle LIKE ? OR g.sellLocation LIKE ?) `;
        countSql += ` AND (g.goodsBoardTitle LIKE ? OR g.sellLocation LIKE ?) `;
        queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
        countParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (categories) {
        const categoryList = categories.split(',').map(cat => `'${cat}'`).join(',');
        sql += ` AND g.categoryId IN (${categoryList}) `;
        countSql += ` AND g.categoryId IN (${categoryList}) `;
    }

    if (minPrice) {
        sql += ` AND g.goodsPrice >= ? `;
        countSql += ` AND g.goodsPrice >= ? `;
        queryParams.push(minPrice);
        countParams.push(minPrice);
    }

    if (maxPrice) {
        sql += ` AND g.goodsPrice <= ? `;
        countSql += ` AND g.goodsPrice <= ? `;
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
        LIMIT 5
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

// 상품 상세 정보 가져오기 API (GET 방식)
app.get('/used-goods/:id', (req, res) => {
    const goodsBoardId = req.params.id;

    // 조회수 증가 쿼리
    const updateViewCountQuery = `UPDATE usedgoodsboard SET viewCount = viewCount + 1 WHERE goodsBoardId = ?`;

    connection.query(updateViewCountQuery, [goodsBoardId], (err, results) => {
        if (err) {
            console.error('조회수 업데이트 중 오류 발생: ', err);
            return res.status(500).send('조회수 업데이트 중 오류 발생');
        }

        // 조회수 업데이트 후 상품 정보 조회
        const selectGoodsQuery = `SELECT * FROM usedgoodsboard WHERE goodsBoardId = ?`;

        connection.query(selectGoodsQuery, [goodsBoardId], (err, goods) => {
            if (err) {
                console.error('상품 정보 조회 중 오류 발생: ', err);
                return res.status(500).send('상품 정보 조회 중 오류 발생');
            }
            if (goods.length > 0) {
                res.json(goods[0]);  // 데이터가 있으면 첫 번째 결과만 반환
            } else {
                res.status(404).send('해당 상품을 찾을 수 없습니다.');
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
        SELECT c.categoryId, c.categoryName, COUNT(ug.categoryId) AS productCount
        FROM Category c
        LEFT JOIN usedgoodsboard ug ON c.categoryId = ug.categoryId
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

// 판매자가 자신의 게시글에 대한 모든 채팅방을 조회하는 API
app.get('/chat/rooms/:goodsBoardId', (req, res) => {
    const goodsBoardId = req.params.goodsBoardId;
    const sellerId = req.query.sellerId;  // 로그인한 판매자의 ID

    // 판매자가 해당 게시글에 대해 생성된 모든 채팅방을 조회
    const query = `
        SELECT chatRoomId, goodsBuyerId, userInfo.userName as buyerName
        FROM chatRoom
        JOIN userInfo ON chatRoom.goodsBuyerId = userInfo.userId
        WHERE chatRoom.goodsBoardId = ? AND chatRoom.sellerId = ?
    `;

    connection.query(query, [goodsBoardId, sellerId], (err, results) => {
        if (err) {
            console.error('채팅방 목록 조회 오류:', err);
            return res.status(500).json({ error: '채팅방 목록 조회 오류' });
        }

        res.json({ chatRooms: results });
    });
});



app.post('/chat/check-room', (req, res) => {
    const { goodsBoardId, sellerId, buyerId } = req.body;
    console.log("Checking room for: ", goodsBoardId, sellerId, buyerId);

    // goodsBoardId를 사용하여 usedGoodsBoard 테이블에서 isSoldOut 값을 가져옴
    const query = `
        SELECT cr.chatRoomId, ugb.isSoldOut 
        FROM chatRoom cr
        JOIN usedGoodsBoard ugb ON cr.goodsBoardId = ugb.goodsBoardId
        WHERE cr.goodsBoardId = ? AND cr.sellerId = ? AND cr.goodsBuyerId = ?`;

    connection.query(query, [goodsBoardId, sellerId, buyerId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length > 0) {
            const isSoldOut = results[0].isSoldOut;
            if (isSoldOut) {
                return res.json({ chatRoomExists: true, chatRoomId: results[0].chatRoomId, isSoldOut: true });
            } else {
                return res.json({ chatRoomExists: true, chatRoomId: results[0].chatRoomId, isSoldOut: false });
            }
        } else {
            console.log("No existing room found");
            return res.json({ chatRoomExists: false });
        }
    });
});




app.post('/chat/create-room', (req, res) => {
    const { goodsBoardId, sellerId, buyerId } = req.body;
    console.log(goodsBoardId);
    console.log(sellerId);
    console.log(buyerId);

    // 새로운 채팅방 생성
    const query = `
        INSERT INTO chatRoom (goodsBoardId, sellerId, goodsBuyerId) 
        VALUES (?, ?, ?)`;

    connection.query(query, [goodsBoardId, sellerId, buyerId], (err, results) => {
        if (err) {
            console.error('Error creating chat room:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ chatRoomId: results.insertId });
    });
});

app.get('/chat/room/:chatRoomId', (req, res) => {
    const chatRoomId = req.params.chatRoomId;

    const query = `SELECT * FROM chatRoom WHERE chatRoomId = ?`;

    connection.query(query, [chatRoomId], (err, results) => {
        if (err) {
            console.error('Error fetching chat room:', err);
            return res.status(500).json({ error: 'Database error occurred while fetching chat room' });
        }

        if (results.length > 0) {
            // 채팅방이 존재할 경우 채팅방 데이터를 반환
            res.json({ chatRoom: results[0] });
        } else {
            res.status(404).json({ error: 'Chat room not found' });
        }
    });
});

// 채팅방 목록을 조회하는 API
app.get('/chat/my-rooms', (req, res) => {
    const sellerId = req.query.sellerId;  // 클라이언트에서 전달된 sellerId (로그인된 사용자 ID)

    if (!sellerId) {
        return res.status(400).send({ success: false, message: 'sellerId가 필요합니다.' });
    }

    // sellerId가 일치하는 채팅방 목록 조회
    connection.query('SELECT * FROM chatRoom WHERE sellerId = ?', [sellerId], (err, chatRooms) => {
        if (err) {
            console.error('채팅방 목록 조회 오류:', err);
            return res.status(500).send({ success: false, message: '서버 오류' });
        }

        if (chatRooms.length === 0) {
            return res.status(200).send({ success: true, chatRooms: [] });
        }

        // 각 채팅방의 상품 이름을 가져오기 위해 상품 ID로 조회
        const goodsBoardIds = chatRooms.map(room => room.goodsBoardId);
        connection.query('SELECT goodsBoardId, goodsBoardTitle FROM usedGoodsBoard WHERE goodsBoardId IN (?)', [goodsBoardIds], (err, goods) => {
            if (err) {
                console.error('상품 정보 조회 오류:', err);
                return res.status(500).send({ success: false, message: '서버 오류' });
            }

            // 상품 제목을 채팅방 목록에 추가
            const goodsMap = new Map(goods.map(item => [item.goodsBoardId, item.goodsBoardTitle]));
            const enrichedChatRooms = chatRooms.map(room => ({
                ...room,
                goodsItemName: goodsMap.get(room.goodsBoardId) || '알 수 없음'
            }));

            res.status(200).send({ success: true, chatRooms: enrichedChatRooms });
        });
    });
});

// 상품 정보 조회 API
app.get('/goods/:id', (req, res) => {
    const goodsBoardId = req.params.id;

    connection.query('SELECT goodsBoardId, goodsBoardTitle FROM usedGoodsBoard WHERE goodsBoardId = ?', [goodsBoardId], (err, results) => {
        if (err) {
            console.error('상품 정보 조회 오류:', err);
            return res.status(500).send({ success: false, message: '서버 오류' });
        }

        if (results.length === 0) {
            return res.status(404).send({ success: false, message: '상품을 찾을 수 없습니다.' });
        }

        const item = results[0];
        res.status(200).send({ success: true, goodsItemName: item.goodsBoardTitle });
    });
});










