export type VerificationStatus = "none" | "pendente" | "aprovado" | "rejeitado";

export const VERIFICATION_STATUSES: VerificationStatus[] = [
  "none",
  "pendente",
  "aprovado",
  "rejeitado",
];

export const verificationLabel = (status: string | null | undefined): string => {
  switch (status) {
    case "aprovado":
      return "Verificado";
    case "pendente":
      return "Em análise";
    case "rejeitado":
      return "Rejeitado";
    default:
      return "Sem verificação";
  }
};

export const verificationDescription = (status: string | null | undefined): string => {
  switch (status) {
    case "aprovado":
      return "Perfil verificado!";
    case "pendente":
      return "A sua verificação está em análise. Voltaremos a dar-lhe resposta em breve.";
    case "rejeitado":
      return "A verificação foi rejeitada.";
    default:
      return "Envie um documento e selfie para verificar a sua identidade.";
  }
};

export const isVerifiedStatus = (status: string | null | undefined): boolean =>
  status === "aprovado";

export const canSubmitVerification = (status: string | null | undefined): boolean =>
  status === "none" || status === "rejeitado";