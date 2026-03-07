import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <button class="font-bold text-lg bg-blue-500 text-white p-2 rounded">przycisk tailwindcss</button>
        <div>Strona STT</div>
    </>
  )
}

export default App
