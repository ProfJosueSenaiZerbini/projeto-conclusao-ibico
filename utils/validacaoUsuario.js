export const normalizarNome = (valor, tamanhoMinimo = 1) => {
    if (typeof valor !== 'string') return null;
    const nome = valor.trim();
    const tamanho = [...nome].length;
    return tamanho >= tamanhoMinimo && tamanho <= 100 ? nome : null;
};

export const normalizarEmail = (valor) => {
    if (typeof valor !== 'string') return null;
    const email = valor.trim().toLowerCase();
    if ([...email].length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email;
};

export const normalizarCpf = (valor) => {
    if (typeof valor !== 'string') return null;
    const cpf = valor.trim();
    const formatado = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
    const semFormatacao = /^\d{11}$/.test(cpf);
    if (!formatado && !semFormatacao) return null;

    const digitos = cpf.replace(/\D/g, '');
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
};

export const senhaValida = (senha) => (
    typeof senha === 'string' &&
    [...senha].length >= 6 &&
    Buffer.byteLength(senha, 'utf8') <= 72
);

export const idadeValida = (valor) => {
    if (typeof valor !== 'string' && typeof valor !== 'number') return false;
    const idade = Number(valor);
    return Number.isInteger(idade) && idade >= 18 && idade <= 2147483647;
};

export const erroDeDuplicidade = (erro) => (
    erro?.code === 'ER_DUP_ENTRY' || erro?.errno === 1062
);
