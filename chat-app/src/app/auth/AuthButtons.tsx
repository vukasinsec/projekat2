"use client"
import { Button } from '@/components/ui/button'
import { LoginLink, RegisterLink } from '@kinde-oss/kinde-auth-nextjs/components'
import React, { useState } from 'react'

export const AuthButtons = () => {

  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex gap-3 flex-1 md:flex-row flex-col relative z-50">
      <RegisterLink className='flex-1' onClick={() => setIsLoading(true)}>
        <Button className="w-full flex-1" variant={"outline"} disabled={isLoading}>
            Sign up
        </Button>
      </RegisterLink>
      
      <LoginLink className='flex-1' onClick={() => setIsLoading(true)}>
        <Button className="w-full flex-1" disabled={isLoading}>
            Login
        </Button>
      </LoginLink>
    </div>
  )
}
