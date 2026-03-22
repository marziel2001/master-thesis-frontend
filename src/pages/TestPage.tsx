import { useState } from 'react'

function TestPage() {
    const [file, setFile] = useState(null)
    const [result, setResult] = useState('')
    const [loading, setLoading] = useState(false)

    const handleUpload = async () => {
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        try {
            setLoading(true)

            const res = await fetch('http://127.0.0.1:8000/api/transcribe', {
                method: 'POST',
                body: formData,
                headers: {
                    accept: 'application/json',
                    // ❗ NIE ustawiaj Content-Type ręcznie!
                },
            })

            const data = await res.json()
            setResult(data.text || JSON.stringify(data))
        } catch (err) {
            console.error(err)
            setResult('Błąd podczas transkrypcji')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Upload audio</h2>

            <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files[0])}
            />

            <br />
            <br />

            <button onClick={handleUpload} disabled={loading}>
                {loading ? 'Transkrypcja...' : 'Wyślij'}
            </button>

            <h3>Wynik:</h3>
            <pre>{result}</pre>
        </div>
    )
}

export default TestPage
