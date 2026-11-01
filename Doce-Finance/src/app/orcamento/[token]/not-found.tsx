export default function OrcamentoNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFAF7] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#7C4A35]/10 text-2xl">
          🧁
        </div>
        <h1 className="text-xl font-bold text-gray-900">Orçamento não encontrado</h1>
        <p className="mt-2 text-sm text-gray-600">
          Este link de orçamento é inválido ou foi removido. Entre em contato com o atelier
          para receber um novo link.
        </p>
      </div>
    </div>
  )
}
