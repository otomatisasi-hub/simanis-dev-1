'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Bell, Trash2, AlertCircle, Clock, DollarSign } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Notification {
  id: string
  title: string
  message: string
  type: 'pnbp_request' | 'pnbp_completed' | 'pnbp_hold' | 'general'
  reference_id?: string
  is_read: boolean
  created_at: string
}

export function NotificationsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    const initPage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        await fetchNotifications(user.id)
      }
    }

    initPage()
  }, [])

  const fetchNotifications = async (userId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:3001/api/notifications/${userId}?limit=50`)
      const result = await response.json()

      if (result.success) {
        setNotifications(result.data || [])
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error('Fetch notifications error:', error)
      toast({
        title: "Error",
        description: error.message || "Gagal memuat notifikasi",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (notificationId: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      const result = await response.json()
      if (result.success) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ))
        toast({
          title: "Berhasil",
          description: "Notifikasi ditandai sudah dibaca"
        })
      }
    } catch (error: any) {
      console.error('Mark read error:', error)
      toast({
        title: "Error",
        description: "Gagal menandai notifikasi",
        variant: "destructive"
      })
    }
  }

  const handleMarkAllRead = async () => {
    if (!currentUser) return

    try {
      const response = await fetch('http://localhost:3001/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })

      const result = await response.json()
      if (result.success) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })))
        toast({
          title: "Berhasil",
          description: "Semua notifikasi ditandai sudah dibaca"
        })
      }
    } catch (error: any) {
      console.error('Mark all read error:', error)
      toast({
        title: "Error",
        description: "Gagal menandai semua notifikasi",
        variant: "destructive"
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pnbp_request':
        return <DollarSign className="h-5 w-5 text-blue-600" />
      case 'pnbp_completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'pnbp_hold':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseColors = {
      'pnbp_request': 'bg-blue-50 border-blue-200',
      'pnbp_completed': 'bg-green-50 border-green-200',
      'pnbp_hold': 'bg-orange-50 border-orange-200',
      'general': 'bg-gray-50 border-gray-200'
    }
    
    if (isRead) {
      return 'bg-white border-gray-200 opacity-70'
    }
    
    return baseColors[type as keyof typeof baseColors] || baseColors.general
  }

  const handleNotificationClick = (notif: Notification) => {
    // Auto mark as read when clicked
    if (!notif.is_read) {
      handleMarkRead(notif.id)
    }

    // Navigate based on notification type
    if (notif.type === 'pnbp_request' || notif.type === 'pnbp_completed' || notif.type === 'pnbp_hold') {
      navigate('/keuangan/pnbp')
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8E1]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Memuat notifikasi...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8E1]">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-8 w-8" />
                Notifikasi
              </h1>
              <p className="text-gray-600 mt-1">
                {unreadCount > 0 
                  ? `Anda memiliki ${unreadCount} notifikasi yang belum dibaca`
                  : 'Semua notifikasi sudah dibaca'}
              </p>
            </div>
            
            {unreadCount > 0 && (
              <Button 
                onClick={handleMarkAllRead} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Tandai Semua Sudah Dibaca
              </Button>
            )}
          </div>

          {/* FILTER TABS */}
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
            >
              Semua ({notifications.length})
            </Button>
            <Button
              onClick={() => setFilter('unread')}
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
            >
              Belum Dibaca ({unreadCount})
            </Button>
            <Button
              onClick={() => setFilter('read')}
              variant={filter === 'read' ? 'default' : 'outline'}
              size="sm"
            >
              Sudah Dibaca ({notifications.length - unreadCount})
            </Button>
          </div>
        </div>

        {/* NOTIFICATIONS LIST */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">
                {filter === 'unread' 
                  ? 'Tidak ada notifikasi yang belum dibaca'
                  : filter === 'read'
                  ? 'Tidak ada notifikasi yang sudah dibaca'
                  : 'Tidak ada notifikasi'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => (
              <Card 
                key={notif.id} 
                className={`border transition-all hover:shadow-md cursor-pointer ${getNotificationColor(notif.type, notif.is_read)} ${
                  !notif.is_read ? 'ring-2 ring-blue-300' : ''
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                          {notif.title}
                          {!notif.is_read && (
                            <Badge className="bg-blue-600 text-white text-xs">
                              Baru
                            </Badge>
                          )}
                        </h3>
                        
                        {!notif.is_read && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkRead(notif.id)
                            }}
                            className="flex-shrink-0"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                        {notif.message}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
