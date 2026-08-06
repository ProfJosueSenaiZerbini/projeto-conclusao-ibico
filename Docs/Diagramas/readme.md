classDiagram
    class Usuario {
        -int id
        -String nome
        -String email
        -String senhaHash
        -TipoPerfil tipoPerfil
        -Double saldoCarteira
        +autenticar() boolean
        +consultarSaldo() Double
        +atualizarSaldo(valor: Double) void
    }

    class Vaga {
        -int id
        -int contratanteId
        -int trabalhadorId
        -String titulo
        -String descricao
        -Double valor
        -StatusVaga status
        +criarVaga() void
        +selecionarTrabalhador(trabalhadorId: int) void
        +concluirVaga() void
        +cancelarVaga() void
    }

    class Candidatura {
        -int id
        -int vagaId
        -int trabalhadorId
        -DateTime dataCandidatura
        -StatusCandidatura status
        +aceitar() void
        +recusar() void
    }

    class Transacao {
        -int id
        -int vagaId
        -Double valor
        -StatusTransacao status
        -DateTime dataCriacao
        +bloquearSaldo() boolean
        +liberarSaldo() boolean
        +estornarSaldo() boolean
    }

    class TipoPerfil {
        <<enumeration>>
        CONTRATANTE
        TRABALHADOR
    }

    class StatusVaga {
        <<enumeration>>
        ABERTA
        EM_ANDAMENTO
        CONCLUIDA
        CANCELADA
    }

    class StatusCandidatura {
        <<enumeration>>
        PENDENTE
        ACEITA
        RECUSADA
    }

    class StatusTransacao {
        <<enumeration>>
        RETIDO
        LIBERADO
        ESTORNADO
    }

    Usuario "1" -- "*" Vaga : publica
    Usuario "1" -- "*" Vaga : realiza
    Usuario "1" -- "*" Candidatura : se candidata
    Vaga "1" -- "*" Candidatura : recebe
    Vaga "1" -- "0..1" Transacao : possui garantia

    Usuario ..> TipoPerfil
    Vaga ..> StatusVaga
    Candidatura ..> StatusCandidatura
    Transacao ..> StatusTransacao StatusTransacao
