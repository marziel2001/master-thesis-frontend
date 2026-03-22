export default function MainPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">
                Transkrypcja Pliku
            </h1>
            <p className="text-sm text-gray-600">
                Wybierz tryb pracy z nawigacji. Strona testowa zawiera
                porównanie wielu modeli.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800">
                        Upload audio
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800">
                        Wybór modelu i uruchomienie transkrypcji
                    </p>
                </div>
            </div>
        </div>
    )
}
