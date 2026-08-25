export function QueryError({ message = 'No se pudo cargar la información.' }: { message?: string }) {
  return (
    <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}
