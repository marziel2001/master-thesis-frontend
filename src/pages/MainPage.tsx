import TranscriptionWidget from '../components/TranscriptionWidget'

export default function MainPage() {
    return (
        <div className="bg-red-500 min-h-100">
            <button>Wgraj plik audio</button>
            <button>Wgraj tekst referencyjny</button>

            <TranscriptionWidget model="Miscrosoft" />
            <TranscriptionWidget model="Amazon" />

            <button>Run transcription</button>
        </div>
    )
}
