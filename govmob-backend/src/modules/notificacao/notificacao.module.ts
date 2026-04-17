import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OneSignalPushService } from './infrastructure/push/onesignal-push.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    { provide: 'PushNotificationPort', useClass: OneSignalPushService },
  ],
  exports: ['PushNotificationPort'],
})
export class NotificacaoModule {}
