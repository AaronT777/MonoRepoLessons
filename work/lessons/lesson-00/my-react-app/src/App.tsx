import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState<number>(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to CS 5500!</h1>
        <p>This is my first React Vite TypeScript project.</p>
        <button onClick={() => setCount(count + 1)}>
          Count: {count}
        </button>
      </header>
    </div>
  )
}

export default App