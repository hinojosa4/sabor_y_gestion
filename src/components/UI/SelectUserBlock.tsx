import { Briefcase, Users } from 'lucide-react'
import React, { useState } from 'react'

interface SelectUserBlockProps {
  setSelectedRole: React.Dispatch<React.SetStateAction<boolean>>,
  setRol: React.Dispatch<React.SetStateAction<string>>
}

export const SelectUserBlock = ({setSelectedRole, setRol}: SelectUserBlockProps) => {

  const [iconSize, setIconSize] = useState('size[40]')

  const handleSelectRole = (name: string) => {
    setSelectedRole(true);
    setRol(name);
  }

  return (
    <div className='grid grid-cols-2 gap-[20px] mt-[40px] mb-[30px]'>
        <div className='flex flex-col items-center p-[1rem] pt-[20px] pb-[20px] w-[400px] transition-all duration-300 cursor-pointer group border-2 border-[#D1D5DB] rounded-[6%] hover:border-[#FFA500]'>
          <div className="flex justify-center items-center size-[80] bg-[#ea580c] rounded-[20px]">
            <Users className="size-[40] text-[white]"/>
          </div>
          <div className='flex flex-col items-center mt-[10px] mb-[20px]'>
              <h1> Acceder </h1>
              <span className='opacity-[45%]'> Para clientes del restaurante </span>
          </div>
          <div className="w-[100%] mt-[0.5rem] text-sm md:text-base text-[#757575]">
            <p className="flex items-center gap-[0.5rem]">
              <span className="size-[0.5rem] bg-[#ea580c] rounded-full"></span>
              Ver menú y realizar pedidos
            </p>
            <p className="flex items-center gap-[0.5rem]">
              <span className="size-[0.5rem] bg-[#ea580c] rounded-full"></span>
              Hacer reservaciones
            </p>
            <p className="flex items-center gap-[0.5rem]">
              <span className="size-[0.5rem] bg-[#ea580c] rounded-full"></span>
              Seguimiento de órdenes
            </p>
          </div>
          <button 
            onClick={() => handleSelectRole("cliente")}
            className={'bg-[#ea580c] w-[100%] text-[white] text-[1rem] rounded-[8] border-[#ea580c] px-[20] py-[10] mt-[20px] hover:bg-[#E65100] transition-all duration-200'}
          >
            Continuar como Cliente
          </button>
        </div>

        <div className='flex flex-col items-center p-[1rem] pt-[20px] pb-[20px] w-[400px] transition-all duration-300 cursor-pointer group border-2 border-[#D1D5DB] rounded-[6%] hover:border-[#9C27B0]'>
          <div className="flex justify-center items-center size-[80] bg-[purple] rounded-[20px]">
            <Briefcase className="size-[40] text-[white]"/>
          </div>
          <div className='flex flex-col items-center mt-[10px] mb-[20px]'>
              <h1> Acceder </h1>
              <span className='opacity-[45%]'> Para clientes del restaurante </span>
          </div>
          <div className="w-[100%] mt-[0.5rem] text-sm md:text-base text-[#757575]">
            <p className="flex items-center gap-[0.5rem]">
              <span className="size-[0.5rem] bg-[#9C27B0] rounded-full"></span>
              Panel de gestión
            </p>
            <p className="flex items-center gap-[0.5rem]">
              <span className="size-[0.5rem] bg-[#9C27B0] rounded-full"></span>
              Control de operaciones
            </p>
            <p className="flex items-center gap-[0.5rem]">
              <span className="size-[0.5rem] bg-[#9C27B0] rounded-full"></span>
              Acceso segun rol
            </p>
          </div>
          <button 
            onClick={() => handleSelectRole("admin")}
            className='bg-[#9C27B0] w-[100%] text-[white] text-[1rem] rounded-[8] border-[#9C27B0] px-[20] py-[10] mt-[20px] hover:bg-[#8E24AA] transition-all duration-200'
          >
            Acceso para personal
          </button>
        </div>
    </div>
  )
}
