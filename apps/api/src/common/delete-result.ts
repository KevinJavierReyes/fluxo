/**
 * Contrato único de respuesta para los `remove()` de entidades que pueden
 * archivarse en vez de borrarse (cuando tienen referencias). Antes, archivar
 * devolvía la entidad completa y borrar devolvía `{id, deleted:true}` — dos
 * formas distintas que obligaban a quien llamaba (incluida una tool MCP) a
 * inferir qué pasó por la forma del objeto en vez de leerlo explícitamente.
 */
export interface DeleteResult<T> {
  id: string;
  action: 'deleted' | 'archived';
  entity: T | null;
}

export function archivedResult<T>(id: string, entity: T): DeleteResult<T> {
  return { id, action: 'archived', entity };
}

export function deletedResult<T = never>(id: string): DeleteResult<T> {
  return { id, action: 'deleted', entity: null };
}
