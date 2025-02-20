import axios from "axios";

export function handleAxiosError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.message || "Erro ao validar credenciais";

    throw {
      status: statusCode,
      message: errorMessage,
      error: "Erro de autenticação",
    };
  }

  // Tratamento genérico para erros desconhecidos
  throw {
    status: 500,
    message: "Erro interno ao validar credenciais",
    error: "Erro no servidor",
  };
}
