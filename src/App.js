import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('https://chat-backend-spanb4.herokuapp.com/');

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('Guest');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const lastMessageRef = useRef(null);
  const [typingStatus, setTypingStatus] = useState('');
  const [users, setUsers] = useState([]);

  const handleTyping = () => socket.emit('typing', `${username} is typing...`);

  const onLoginClick = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/login', { username });
      if (res) {
        setIsLoggedIn(true);
        socket.emit('add user', username);
      }
    } catch (err) {
      setError(err.response.data);
    }
  };

  const onInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const onUserNickNameChange = (e) => {
    setUsername(e.target.value);
  };

  const onPMClick = (username) => {
    setInputValue(`/pm ${username} `);
  };

  const onMessageSend = (e) => {
    e.preventDefault();

    if (inputValue) {
      if (inputValue.startsWith('/pm ')) {
        const strWithoutPm = inputValue.substring(4);
        const msg = strWithoutPm.substring(strWithoutPm.indexOf(' ') + 1);
        const user = strWithoutPm.substring(0, strWithoutPm.indexOf(' '));

        socket.emit('private message', msg, user, username);
        setMessages([...messages, { text: `PM to ${user}: ${msg}`, time: new Date().getTime() }]);
      } else {
        socket.emit('chat message', inputValue, username);
        setMessages([...messages, { username, text: inputValue, time: new Date().getTime() }]);
      }
    }
    setInputValue('');
  };

  useEffect(() => {
    socket.on('typingResponse', (data) => setTypingStatus(data));
  }, [socket]);

  useEffect(() => {
    setTimeout(() => {
      socket.off('typing');
      setTypingStatus('');
    }, 3000);
  }, [typingStatus]);

  useEffect(() => {
    socket.on('chat message', (msg, username) => {
      setMessages([...messages, { username, text: msg, time: new Date().getTime() }]);
    });

    socket.on('private message', (msg, username) => {
      setMessages([...messages, { text: `PM from ${username}: ${msg}`, time: new Date().getTime() }]);
    });

    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    socket.on('user connected', (username, users) => {
      setUsers(users);
      socket.emit('chat message', `${username} connected`);
    });

    return () => {
      socket.off('user connected');
    };
  }, [users]);

  socket.on('user disconnected', (user, users) => {
    setMessages([...messages, { text: `${user.username} disconnected`, time: new Date().getTime() }]);
    setUsers(users);
  });

  return (
    <>
      {isLoggedIn && (
        <div className="chat">
          <div className="chat__sidebar">
            <h2>Open Chat</h2>
            <div>
              <h4 className="chat__header">ACTIVE USERS</h4>
              <div className="chat__users">
                {users.map((user) => (
                  <p key={user.userId}>
                    {user.username !== username ? <span>{user.username}</span> : <span>{user.username} - You</span>}
                    {user.username !== username ? (
                      <>
                        <span style={{ color: 'black' }}> | </span>
                        <span onClick={() => onPMClick(user.username)} className="send-pm">
                          Send PM
                        </span>
                      </>
                    ) : null}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="chat__main">
            <header className="chat__mainHeader">
              <p>Hangout with Colleagues</p>
            </header>
            <div className="message__container">
              {messages.map((msg, i) =>
                msg.username === username ? (
                  <div className="message__chats" key={i}>
                    <p className="sender__name sender__name--right">You</p>
                    <div className="message__sender">
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ) : msg.username ? (
                  <div className="message__chats" key={i}>
                    <p className="sender__name">{msg.username}</p>
                    <div className="message__recipient">
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="message__chats" key={i}>
                    <div className="message__connection">
                      <p>{msg.text}</p>
                    </div>
                  </div>
                )
              )}
              <div className="message__status">
                <p>{typingStatus}</p>
              </div>
              <div ref={lastMessageRef} />
            </div>
            <div className="chat__footer">
              <form className="form" onSubmit={onMessageSend}>
                <input
                  placeholder="Write message"
                  className="message-input"
                  value={inputValue}
                  onChange={onInputChange}
                  onKeyDown={handleTyping}
                  autoComplete="off"
                />
                <button className="send-message-btn">Send</button>
              </form>
            </div>
          </div>
        </div>
      )}
      {!isLoggedIn && (
        <form onSubmit={onLoginClick} className="home__container">
          <label htmlFor="nickname">Username:</label>
          <input
            className="username__input"
            type="text"
            name="name"
            required
            minLength={1}
            value={username}
            onChange={onUserNickNameChange}
          />
          <button className="username__submit-btn">Enter</button>
          <p style={{ color: 'red' }}>{error}</p>
        </form>
      )}
    </>
  );
}

export default App;
