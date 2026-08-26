import { fluxoUndoTool } from './fluxo-undo.tool';
import type { McpUndoService } from '../undo/mcp-undo.service';

function makeUndoServiceMock() {
  return { undo: jest.fn() };
}

describe('fluxoUndoTool', () => {
  const ctx = { userId: 'user-1', timezone: 'UTC' };

  it('delega en McpUndoService.undo y arma el mensaje con el resultado', async () => {
    const undoService = makeUndoServiceMock();
    undoService.undo.mockResolvedValue({
      auditId: 'audit-1',
      tool: 'record_transaction',
      entityType: 'transaction',
      entityId: 'tx-1',
    });
    const tool = fluxoUndoTool({
      undoService: undoService as unknown as McpUndoService,
    });

    const result = await tool.handler({ auditId: 'audit-1' }, ctx);

    expect(undoService.undo).toHaveBeenCalledWith('user-1', 'audit-1');
    expect(result.content[0].text).toContain('record_transaction');
    expect(result.content[0].text).toContain('tx-1');
  });

  it('pasa auditId undefined cuando no se lo dan (deshace la última creación)', async () => {
    const undoService = makeUndoServiceMock();
    undoService.undo.mockResolvedValue({
      auditId: 'audit-2',
      tool: 'fluxo_create',
      entityType: 'asset',
      entityId: 'asset-1',
    });
    const tool = fluxoUndoTool({
      undoService: undoService as unknown as McpUndoService,
    });

    await tool.handler({}, ctx);

    expect(undoService.undo).toHaveBeenCalledWith('user-1', undefined);
  });

  it('propaga el error de McpUndoService.undo tal cual (el error mapping lo hace el factory)', async () => {
    const undoService = makeUndoServiceMock();
    const error = new Error('boom');
    undoService.undo.mockRejectedValue(error);
    const tool = fluxoUndoTool({
      undoService: undoService as unknown as McpUndoService,
    });

    await expect(tool.handler({}, ctx)).rejects.toThrow('boom');
  });
});
