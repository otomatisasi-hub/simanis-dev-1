import { useState } from "react"
import { LoginForm } from "@/components/auth/LoginForm"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { Button } from "@/components/ui/custom-button"
import cityHeroBackground from "@/assets/city-hero-bg.jpg"

type AuthView = "login" | "register" | "forgot-password"

export function Auth() {
  const [currentView, setCurrentView] = useState<AuthView>("login")

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative p-4"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(30, 64, 175, 0.8), rgba(56, 178, 172, 0.7)), url(${cityHeroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal/20 to-primary/20" />
      
      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">SIMANIS</h1>
          <p className="text-white/90 text-lg">
            Sistem Informasi Manajemen<br />Notaris dan Arsip
          </p>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          {/* Render LoginForm dengan callback onForgotPassword */}
          {currentView === "login" && (
            <LoginForm onForgotPassword={() => setCurrentView("forgot-password")} />
          )}
          
          {/* Render RegisterForm */}
          {currentView === "register" && <RegisterForm />}
          
          {/* Render ForgotPasswordForm dengan callback kembali ke login */}
          {currentView === "forgot-password" && (
            <ForgotPasswordForm onBackToLogin={() => setCurrentView("login")} />
          )}
          
          {/* Tombol Toggle Login/Register (sembunyikan saat forgot password) */}
          {currentView !== "forgot-password" && (
            <div className="text-center">
              <p className="text-white/90 mb-3">
                {currentView === "login" ? "Belum punya akun?" : "Sudah punya akun?"}
              </p>
              <Button
                variant="outline"
                onClick={() => setCurrentView(currentView === "login" ? "register" : "login")}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                {currentView === "login" ? "Daftar Sekarang" : "Masuk ke Akun"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
