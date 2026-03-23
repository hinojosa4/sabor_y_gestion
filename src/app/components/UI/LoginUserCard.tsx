import React from 'react'

interface rolesCard {
    icon: string,
    rol: string,
    trabajo: string
}

export const LoginUserCard = ({icon, rol, trabajo}: rolesCard) => {
  return (
    <div className='flex flex-col'>
        <div className="w-64 p-6 rounded-2xl border-2 border-purple-300 text-center bg-purple-50 hover:shadow-lg hover:-translate-y-1 transition">
        <div className="text-purple-500 mb-4 text-4xl">{icon}</div>

        <h2 className="text-lg font-semibold mb-2">{rol}</h2>

        <p className="text-sm text-gray-600 mb-5">{trabajo}</p>

        <span className="text-purple-500 font-medium text-sm hover:underline">Acceder →</span>
        </div>
    </div>
  )
}
