classDiagram
    direction TB

    %% Enums
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

    class TipoTransacao {
        <<enumeration>>
        DEPOSITO_SIMULADO
        BLOQUEIO_GARANTIA
        ESTORNO_CANCELAMENTO
        PAGAMENTO_RECEBIDO
    }

    %% Classes de Domínio / Modelos
    class Usuario {
        - Integer id
        - String nome
        - String email
        - String senha
        - String telefone
        - Date dataNascimento
        - TipoPerfil perfil
        + Boolean ehMaiorDeIdade()
        + Boolean validarSenha(String senha)
    }

    class CarteiraVirtual {
        - Integer id
        - BigDecimal saldoDisponivel
        - BigDecimal saldoBloqueado
        + void creditar(BigDecimal valor)
        + Boolean bloquearSaldo(BigDecimal valor)
        + void estornarSaldo(BigDecimal valor)
        + void transferirSaldoBloqueado(CarteiraVirtual destino, BigDecimal valor)
    }

    class VagaBico {
        - Integer id
        - String titulo
        - String descricao
        - BigDecimal valorDiaria
        - Date dataServico
        - String horario
        - String bairro
        - StatusVaga status
        - Date dataCriacao
        + Boolean podeSerCancelada()
        + void alterarStatus(StatusVaga novoStatus)
    }

    class Candidatura {
        - Integer id
        - Date dataCandidatura
        - Boolean selecionado
        + void aprovarCandidato()
    }

    class TransacaoFinanceira {
        - Integer id
        - BigDecimal valor
        - TipoTransacao tipo
        - Date dataHora
        - String descricao
    }

    %% Controladores (Camida Controller - MVC)
    class AutenticacaoController {
        + String cadastrarUsuario(Usuario usuario)
        + String realizarLogin(String email, String senha)
    }

    class VagaController {
        + String publicarBico(VagaBico vaga, Integer contratanteId)
        + List~VagaBico~ listarFeedVagas(String ordenacao)
        + String meCandidatar(Integer vagaId, Integer trabalhadorId)
        + String selecionarCandidato(Integer candidaturaId)
        + String finalizarServico(Integer vagaId)
        + String cancelarBico(Integer vagaId)
    }

    class CarteiraController {
        + BigDecimal consultarSaldo(Integer usuarioId)
        + String adicionarSaldoSimulado(Integer usuarioId, BigDecimal valor)
    }

    %% Relacionamentos de Domínio
    Usuario "1" -- "1" CarteiraVirtual : possui >
    Usuario "1" -- "0..*" VagaBico : publica (Contratante) >
    Usuario "1" -- "0..*" Candidatura : realiza (Trabalhador) >
    
    VagaBico "1" -- "0..*" Candidatura : recebe >
    VagaBico "0..1" -- "1" Usuario : contratado (Trabalhador) >
    
    CarteiraVirtual "1" -- "0..*" TransacaoFinanceira : registra >
    VagaBico "1" -- "0..*" TransacaoFinanceira : gera >

    %% Dependências de Controle
    AutenticacaoController ..> Usuario : gerencia
    VagaController ..> VagaBico : gerencia
    VagaController ..> Candidatura : manipula
    CarteiraController ..> CarteiraVirtual : gerencia
