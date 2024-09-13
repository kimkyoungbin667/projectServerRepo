// 노드 실행을 위한 기본적인 설정
const express = require('express');
const app = express();
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // 암호화 내장 모듈

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
const io = socketIo(server, {
    cors: {
        origin: "http://127.0.0.1:5500", // 클라이언트가 실행 중인 주소
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

// 메시지 전송 처리
io.on('connection', (socket) => {
    console.log('클라이언트 연결됨');

    // 클라이언트가 메시지 전송
    socket.on('sendMessage', (data) => {
        const { chatRoomId, senderId, message } = data;

        // 먼저 채팅방이 존재하는지 확인
        connection.query('SELECT * FROM chatRoom WHERE chatRoomId = ?', [chatRoomId], (err, results) => {
            if (err) {
                console.error('채팅방 확인 오류:', err);
                return;
            }

            if (results.length === 0) {
                console.error(`채팅방 ${chatRoomId}이 존재하지 않습니다.`);
                return;
            }

            // 채팅방이 존재할 경우 메시지 저장
            connection.query(
                'INSERT INTO chatMessage (chatRoomId, sender_id, message) VALUES (?, ?, ?)',
                [chatRoomId, senderId, message],
                (err, result) => {
                    if (err) {
                        console.error('메시지 저장 오류:', err);
                        return;
                    }

                    // 저장된 메시지를 클라이언트들에게 전송
                    io.to(chatRoomId).emit('receiveMessage', {
                        chatRoomId,
                        senderId,
                        message,
                        messageTime: new Date()
                    });
                }
            );
        });
    });

    // 클라이언트가 채팅방에 입장
    socket.on('joinRoom', (chatRoomId) => {
        socket.join(chatRoomId);
        console.log(`채팅방 ${chatRoomId}에 입장`);
    });
});

// 채팅방 생성
app.post('/createChatRoom', (req, res) => {
    const { goodsBoardId, buyerId, sellerId } = req.body;

    connection.query('SELECT * FROM chatRoom WHERE goodsBoardId = ? AND goodsBuyerId = ? AND sellerId = ?', [goodsBoardId, buyerId, sellerId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'DB 오류 발생' });
        }
        if (results.length === 0) {
            connection.query('INSERT INTO chatRoom (goodsBoardId, goodsBuyerId, sellerId) VALUES (?, ?, ?)', [goodsBoardId, buyerId, sellerId], (err, result) => {
                if (err) {
                    return res.status(500).json({ success: false, message: '채팅방 생성 오류' });
                }
                res.status(200).json({ success: true, chatRoomId: result.insertId });
            });
        } else {
            res.status(200).json({ success: true, chatRoomId: results[0].chatRoomId });
        }
    });
});

// 서버 실행
server.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
});


