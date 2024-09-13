// 노드 실행을 위한 기본적인 설정
const express = require('express');
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


