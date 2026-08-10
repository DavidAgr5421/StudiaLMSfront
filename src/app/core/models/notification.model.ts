export type NotificationType = 'NuevaActividad' | 'RecordatorioFechaLimite' | 'ContenidoAgregado';

export interface NotificationResult {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId: string | null;
  createdAtUtc: string;
  readAtUtc: string | null;
  emailSent: boolean;
}
