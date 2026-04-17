export interface PushNotificationPort {
  enviar(servidorId: string, payload: Record<string, any>): Promise<void>;
  enviarParaGestor(payload: Record<string, any>): Promise<void>;
  broadcast(corridaId: string, payload: Record<string, any>): Promise<void>;
}
