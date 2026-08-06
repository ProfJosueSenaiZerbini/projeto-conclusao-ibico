import pool from './config/database.js';
import express from 'express';
import session from 'express-session';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath (import.meta.url));

// configuração do express e EJS (Views)
app.set('view engine','ejs');
app.set('views', path.join(__dirname, 'views'));

//middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended:true }));
app.use(express.static(path.join(__dirname,'public')));

//fluxo de login/configuração de sessão
app.use(session({
    secret:process.env.SESSION_SECRET || 'chave-secreta-araponga',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// Exemplo de rota inicial para testar
app.get('/', (req, res) => {
    res.render('index', { usuario: req.session.usuario || null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ta rodando? http://localhost:${PORT}`);
});