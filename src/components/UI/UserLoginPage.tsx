'use client'

import { useRouter } from 'next/router';
import React, { useState } from 'react'

// pagina la logearse pero no se usa

interface role {
    rol: string,
    SetSelectedRole?: React.Dispatch<React.SetStateAction<string>>
}

export const UserLoginPage = ({rol, SetSelectedRole}:role) => {

    const router = useRouter();
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleBack = () => {
        SetSelectedRole && SetSelectedRole("");
    }

  return (
    <div>
        <span> Icon </span>
        <h2> {rol} </h2>

        <form >
            <div>
                <label htmlFor="email">Correo Electronico</label>
                <input 
                    type="email" 
                    id='email'
                    placeholder='usuario@restaurante.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                
                <label htmlFor="password">Contraseña</label>
                <input 
                    type="password" 
                    id='password'
                    placeholder='••••••••'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <button type='submit' > Iniciar Sesión </button>
        </form>
            <button onClick={handleBack}> Volver </button>
    </div>
  )
};
