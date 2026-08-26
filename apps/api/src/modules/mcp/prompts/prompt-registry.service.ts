import { Injectable } from '@nestjs/common';
import { cierreDeMesPrompt } from './cierre-de-mes.prompt';
import { dondeSeFueMiDineroPrompt } from './donde-se-fue-mi-dinero.prompt';
import { revisionMensualPrompt } from './revision-mensual.prompt';
import type { PromptDefinition } from './types';

/** Igual patrón que ToolRegistryService: arma la lista una sola vez, cada request la reutiliza filtrando por scope. */
@Injectable()
export class PromptRegistryService {
  private readonly prompts: PromptDefinition[] = [
    revisionMensualPrompt(),
    cierreDeMesPrompt(),
    dondeSeFueMiDineroPrompt(),
  ];

  getPrompts(): PromptDefinition[] {
    return this.prompts;
  }
}
