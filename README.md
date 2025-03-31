### Any of these works and does what you would expect
- docker-compose up 
- docker-compose up --build
- docker-compose up backend
- docker-compose up frontend

### To build frontend outside of container 
- **ensure that you have the right versions of node and npm
- node -v -> 18.xx.xx
- npm -v -> 10.xx.xx
- *from /frontend*
- npm install
- npm run dev

- configure frontend/.env so main.js knows where the websocket is
### To access api docs 
http://localhost:5000/docs
