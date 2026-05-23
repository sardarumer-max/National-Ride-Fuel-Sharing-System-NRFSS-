import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

export function useAuth() {
  const { setSession, setProfile, setLoading } = useAuthStore()
  const fetchingRef = useRef(false)
  const resolvedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    function resolve(session) {
      if (!mounted || resolvedRef.current) return
      resolvedRef.current = true
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    }

    // PRIMARY: getSession is synchronous-ish and most reliable
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        console.warn('[useAuth] getSession error:', error.message)
        setLoading(false)
        return
      }
      console.log('[useAuth] getSession:', data.session?.user?.email ?? 'no session')
      resolve(data.session)
    }).catch(err => {
      console.error('[useAuth] getSession threw:', err)
      if (mounted) setLoading(false)
    })

    // SECONDARY: listen to future auth changes (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      console.log('[useAuth] auth event:', event)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session)
        if (session?.user) fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setLoading(false)
        resolvedRef.current = false
      } else if (event === 'INITIAL_SESSION') {
        // Already handled by getSession above — skip to avoid double-fetch
        if (!resolvedRef.current) resolve(session)
      }
    })

    // SAFETY NET: 5s hard timeout
    const safetyTimer = setTimeout(() => {
      if (mounted && !resolvedRef.current) {
        console.warn('[useAuth] 5s safety timeout — forcing loading=false')
        setLoading(false)
      }
    }, 5000)

    return () => {
      mounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile(userId) {
    if (fetchingRef.current) return
    fetchingRef.current = true
    console.log('[useAuth] fetchProfile for:', userId)
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn('[useAuth] profile fetch error:', error.code, error.message)
        // Still set loading false — don't hang
        setProfile(null)
        return
      }

      if (data) {
        console.log('[useAuth] profile loaded:', data.full_name, '| role:', data.role)
        setProfile(data)
        return
      }

      // No profile row → create from auth metadata
      console.log('[useAuth] no profile found, creating from auth metadata...')
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !authUser) {
        console.warn('[useAuth] getUser failed:', userErr?.message)
        setProfile(null)
        return
      }

      const meta = authUser.user_metadata || {}
      const { data: newProfile, error: upsertErr } = await supabase
        .from('users')
        .upsert({
          id:          userId,
          full_name:   meta.full_name || authUser.email?.split('@')[0] || 'User',
          cnic:        meta.cnic || '00000-0000000-0',
          mobile:      meta.mobile || '',
          email:       authUser.email || '',
          age:         parseInt(meta.age) || 25,
          city:        meta.city || '',
          profession:  meta.profession || '',
          role:        meta.role || 'user',
          is_verified: false,
        }, { onConflict: 'id' })
        .select()
        .maybeSingle()

      if (upsertErr) {
        console.warn('[useAuth] upsert error:', upsertErr.code, upsertErr.message)
        // Try plain select one more time (race condition — row may now exist)
        const { data: retry } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
        setProfile(retry || null)
      } else {
        console.log('[useAuth] profile created:', newProfile?.full_name)
        setProfile(newProfile || null)
      }
    } catch (ex) {
      console.error('[useAuth] unexpected error:', ex)
      setProfile(null)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  // Return reactive state via store selector
  const { user, profile, session, loading, signOut } = useAuthStore()
  return { user, profile, session, loading, signOut, fetchProfile }
}
