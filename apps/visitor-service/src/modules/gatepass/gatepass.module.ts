import { Module } from '@nestjs/common';
import { GatepassService } from './gatepass.service';
import { GatepassController } from './gatepass.controller';

@Module({
  providers: [GatepassService],
  controllers: [GatepassController],
})
export class GatepassModule {}
