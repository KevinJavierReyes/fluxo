import { Module } from '@nestjs/common';
import { McpModule } from '../mcp/mcp.module';
import { McpSettingsController } from './mcp-settings.controller';
import { McpSettingsService } from './mcp-settings.service';

@Module({
  imports: [McpModule],
  controllers: [McpSettingsController],
  providers: [McpSettingsService],
})
export class McpSettingsModule {}
