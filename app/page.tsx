'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';

// ─── Types ────────────────────────────────────────────────────────
type Lang = 'en' | 'ku';
type Restaurant = {
  id: string; vendor_id: string; name: string; description?: string; phone: string; address: string; city: string;
  latitude?: number; longitude?: number; status: 'active' | 'inactive' | 'pending_approval';
  rating: number; total_reviews: number; delivery_fee: number;
  minimum_order: number; cuisine_type: string; estimated_delivery_time: number;
  opening_time?: string; closing_time?: string; image_url: string; created_at: string;
};
type MenuCategory = { id: string; restaurant_id: string; name: string; display_order: number; is_active: boolean; created_at?: string };
type MenuItem = {
  id: string; restaurant_id: string; category_id: string; name: string; description: string;
  price: number; image_url: string; is_available: boolean; is_vegetarian: boolean;
  preparation_time: number; created_at: string; updated_at?: string;
  menu_categories?: { name: string };
  restaurants?: { name: string };
};
type Order = {
  id: string; order_number: string; status: string;
  customer_id: string; restaurant_id: string; delivery_person_id?: string; delivery_address_id?: string;
  subtotal: number; delivery_fee: number; tax: number; total_amount: number;
  special_instructions?: string; estimated_delivery_time?: string; actual_delivery_time?: string;
  created_at: string; updated_at?: string;
  customer: { full_name: string; email: string; phone: string } | null;
  restaurant: { name: string } | null;
  delivery_person: { full_name: string } | null;
  addresses: { street_address: string; city: string; label: string } | null;
  order_items: { quantity: number; unit_price: number; total_price: number; menu_items: { name: string } | null }[];
};
type IoTDevice = {
  tracking_id: string; order_number: string; restaurant_name: string;
  driver_name: string; current_temp: number; camera_stream_url: string;
  is_pack_online: boolean; last_update: string;
  battery_percentage?: number;
};
type UserProfile = {
  id: string; full_name: string; email: string; phone: string;
  role: string; is_active: boolean; created_at: string;
};

// ─── i18n ─────────────────────────────────────────────────────────
const T: Record<Lang, Record<string, string>> = {
  en: {
    brand: 'FoodAdmin', superadmin: 'Super Admin',
    iot: 'IoT Monitor', restaurants: 'Restaurants', menu: 'Menu Items', orders: 'Live Orders', users: 'Users',
    search: 'Search everything…', lang: 'کوردی',
    addRestaurant: 'Add Restaurant', editRestaurant: 'Edit Restaurant',
    addItem: 'Add Item', editItem: 'Edit Item',
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    name: 'Name', phone: 'Phone', address: 'Address', city: 'City',
    status: 'Status', active: 'Active', inactive: 'Inactive', pending: 'Pending',
    deliveryFee: 'Delivery Fee', minOrder: 'Min Order', estTime: 'Est. Time (min)',
    cuisine: 'Cuisine Type', price: 'Price', description: 'Description',
    category: 'Category', restaurant: 'Restaurant', available: 'Available', vegetarian: 'Vegetarian',
    prepTime: 'Prep Time (min)', imageUrl: 'Image URL',
    customer: 'Customer', driver: 'Driver', total: 'Total', subtotal: 'Subtotal',
    tax: 'Tax', orderItems: 'Order Items', specialNote: 'Special Note',
    role: 'Role', email: 'Email', joined: 'Joined', actions: 'Actions',
    onlineDevices: 'Online Devices', temperature: 'Temperature', battery: 'Battery',
    liveCamera: 'Live Camera', lastUpdate: 'Last Update',
    totalOrders: 'Total Orders', preparing: 'Preparing', inTransit: 'In Transit', delivered: 'Delivered',
    saving: 'Saving…', deleted: 'Deleted', updated: 'Updated ✓', added: 'Added ✓',
    confirmDelete: 'Are you sure you want to delete this?',
    noData: 'No data found', close: 'Close',
    allStatuses: 'All Statuses', allRoles: 'All Roles', allRestaurants: 'All Restaurants',
    rating: 'Rating', reviews: 'Reviews', orderNum: 'Order #',
    pendingApproval: 'Pending Approval', online: 'Online', offline: 'Offline',
    approve: 'Approve', deactivate: 'Deactivate',
    recentActivity: 'Recent Activity', quickAccess: 'Quick Access',
    liveTracking: 'Live IoT Tracking',
  },
  ku: {
    brand: 'خواردن ئەدمین', superadmin: 'سوپەر ئەدمین',
    iot: 'چاودێری IoT', restaurants: 'چێشتخانەکان', menu: 'بڕگەکانی مینیو', orders: 'داواکاریە زیندووەکان', users: 'بەکارهێنەران',
    search: 'گەڕان لە هەموو شتێک…', lang: 'English',
    addRestaurant: 'زیادکردنی چێشتخانە', editRestaurant: 'دەستکاریکردنی چێشتخانە',
    addItem: 'زیادکردنی بڕگە', editItem: 'دەستکاریکردنی بڕگە',
    save: 'پاشەکەوتکردن', cancel: 'پاشگەزبوونەوە', delete: 'سڕینەوە', edit: 'دەستکاری',
    name: 'ناو', phone: 'تەلەفۆن', address: 'ناونیشان', city: 'شار',
    status: 'دۆخ', active: 'چالاک', inactive: 'ناچالاک', pending: 'چاوەڕوان',
    deliveryFee: 'کرێی گەیاندن', minOrder: 'کەمترین داواکاری', estTime: 'کاتی خەمڵاندراو (خولەک)',
    cuisine: 'جۆری خواردن', price: 'نرخ', description: 'وەسف',
    category: 'پۆل', restaurant: 'چێشتخانە', available: 'بەردەستە', vegetarian: 'رووەکی',
    prepTime: 'کاتی ئامادەکردن (خولەک)', imageUrl: 'بەستەری وێنە',
    customer: 'کڕیار', driver: 'شۆفێر', total: 'کۆی گشتی', subtotal: 'کۆی بەشەکی',
    tax: 'باج', orderItems: 'بڕگەکانی داواکاری', specialNote: 'تێبینی تایبەت',
    role: 'ئەرک', email: 'ئیمەیڵ', joined: 'بەرواری تۆمارکردن', actions: 'کردارەکان',
    onlineDevices: 'ئامێرە ئۆنلاینەکان', temperature: 'پلەی گەرمی', battery: 'بەتەری',
    liveCamera: 'کامێرای زیندوو', lastUpdate: 'دوایین نوێکردنەوە',
    totalOrders: 'کۆی داواکاریەکان', preparing: 'ئامادەکردن', inTransit: 'لە ڕێگا', delivered: 'گەیشتووە',
    saving: 'پاشەکەوتکردن…', deleted: 'سڕایەوە', updated: 'نوێکرایەوە ✓', added: 'زیادکرا ✓',
    confirmDelete: 'دڵنیایت لە سڕینەوەی ئەمە؟',
    noData: 'زانیارییەک نەدۆزرایەوە', close: 'داخستن',
    allStatuses: 'هەموو دۆخەکان', allRoles: 'هەموو ئەرکەکان', allRestaurants: 'هەموو چێشتخانەکان',
    rating: 'هەڵسەنگاندن', reviews: 'بۆچوونەکان', orderNum: 'ژ. داواکاری',
    pendingApproval: 'چاوەڕوانی پەسەندکردن', online: 'ئۆنلاین', offline: 'ئۆفلاین',
    approve: 'پەسەندکردن', deactivate: 'ناچالاককردن',
    recentActivity: 'چالاکیی دوایین', quickAccess: 'دەستگەیشتنی خێرا',
    liveTracking: 'شوێنکەوتنی IoT زیندوو',
  }
};

// ─── Helpers ──────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  active: 'badge-green', inactive: 'badge-red', pending_approval: 'badge-amber',
  pending: 'badge-gray', confirmed: 'badge-blue', preparing: 'badge-amber',
  ready_for_pickup: 'badge-purple', picked_up: 'badge-purple', in_transit: 'badge-blue',
  delivered: 'badge-green', cancelled: 'badge-red',
  customer: 'badge-blue', vendor: 'badge-purple', delivery_person: 'badge-amber', admin: 'badge-red',
};
const statusLabel: Record<string, Record<Lang, string>> = {
  active: { en: 'Active', ku: 'چالاک' }, inactive: { en: 'Inactive', ku: 'ناچالاک' },
  pending_approval: { en: 'Pending', ku: 'چاوەڕوان' }, pending: { en: 'Pending', ku: 'چاوەڕوان' },
  confirmed: { en: 'Confirmed', ku: 'پشتراست' }, preparing: { en: 'Preparing', ku: 'ئامادەکردن' },
  ready_for_pickup: { en: 'Ready', ku: 'ئامادەیە' }, picked_up: { en: 'Picked Up', ku: 'وەرگیراوە' },
  in_transit: { en: 'In Transit', ku: 'لە ڕێگا' }, delivered: { en: 'Delivered', ku: 'گەیشتووە' },
  cancelled: { en: 'Cancelled', ku: 'هەڵوەشاوەتەوە' },
};
function fmt(n: number) { return n?.toLocaleString('en-IQ') ?? '0'; }
function timeAgo(ts: string, lang: Lang) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (lang === 'ku') {
    if (diff < 60) return `${Math.floor(diff)} چرکە پێش`;
    if (diff < 3600) return `${Math.floor(diff / 60)} خولەک پێش`;
    return `${Math.floor(diff / 3600)} کاتژمێر پێش`;
  }
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
function tempColor(t: number) {
  if (t < 0) return '#3b82f6';
  if (t < 10) return '#06b6d4';
  if (t < 25) return '#10b981';
  if (t < 35) return '#f59e0b';
  return '#ef4444';
}

// ─── Component ────────────────────────────────────────────────────
export default function SuperAdmin() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<'iot' | 'restaurants' | 'categories' | 'menu' | 'orders' | 'users' | 'my-restaurant'>('iot');
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);

  const t = (k: string) => T[lang][k] ?? k;
  const dir = lang === 'ku' ? 'rtl' : 'ltr';

  // Data
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [iotData, setIotData] = useState<IoTDevice[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Filters
  const [menuFilter, setMenuFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [outsideTemp, setOutsideTemp] = useState<number | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Modal
  const [modal, setModal] = useState<string | null>(null);

  // Forms
  const [resForm, setResForm] = useState({ name: '', description: '', phone: '', address: '', city: '', latitude: '', longitude: '', cuisine_type: '', delivery_fee: '', minimum_order: '', estimated_delivery_time: '30', opening_time: '', closing_time: '', status: 'pending_approval' as Restaurant['status'], image_url: '', vendor_id: '', imageFile: null as File | null });
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', restaurant_id: '', category_id: '', image_url: '', is_available: true, is_vegetarian: false, preparation_time: '15', imageFile: null as File | null });
  const [catForm, setCatForm] = useState({ name: '', restaurant_id: '', display_order: '0', is_active: true });
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [selectedIot, setSelectedIot] = useState<IoTDevice | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500);
  };

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchRestaurants = useCallback(async () => {
    let q = supabase.from('restaurants').select('*');
    if (userProfile?.role === 'vendor' && session?.user?.id) {
      q = q.eq('vendor_id', session.user.id);
    }
    const { data } = await q.order('created_at', { ascending: false });
    if (data) setRestaurants(data as Restaurant[]);
  }, [userProfile, session]);

  const fetchMenu = useCallback(async () => {
    let qItems = supabase.from('menu_items').select('*, menu_categories(name), restaurants(name)');
    let qCats = supabase.from('menu_categories').select('*');

    if (userProfile?.role === 'vendor' && session?.user?.id) {
      const { data: vendorRes } = await supabase.from('restaurants').select('id').eq('vendor_id', session.user.id);
      const resIds = vendorRes?.map(r => r.id) || [];
      qItems = qItems.in('restaurant_id', resIds);
      qCats = qCats.in('restaurant_id', resIds);
    }

    const { data: items } = await qItems.order('created_at', { ascending: false });
    const { data: cats } = await qCats.order('display_order', { ascending: true });

    if (items) setMenuItems(items as MenuItem[]);
    if (cats) setCategories(cats as MenuCategory[]);
  }, [userProfile, session]);

  const fetchOrders = useCallback(async () => {
    let q = supabase.from('orders').select(`
        *, 
        customer:customer_id(full_name,email,phone), 
        restaurant:restaurant_id(name), 
        delivery_person:delivery_person_id(full_name),
        addresses:delivery_address_id(street_address, city, label),
        order_items(quantity,unit_price,total_price,menu_items(name))
      `);
    if (userProfile?.role === 'vendor' && session?.user?.id) {
      const { data: vendorRes } = await supabase.from('restaurants').select('id').eq('vendor_id', session.user.id);
      const resIds = vendorRes?.map(r => r.id) || [];
      q = q.in('restaurant_id', resIds);
    }
    const { data } = await q.order('created_at', { ascending: false }).limit(100);
    if (data) setOrders(data as unknown as Order[]);
  }, [userProfile, session]);

  const fetchIoT = useCallback(async () => {
    const { data } = await supabase.from('super_admin_live_dashboard').select('*');
    if (data) {
      const { data: dt } = await supabase.from('delivery_tracking').select('id,battery_percentage,is_pack_online,current_temp').eq('is_pack_online', true);
      const merged = (data as IoTDevice[]).map((d, i) => ({ ...d, battery_percentage: dt?.[i]?.battery_percentage }));
      
      if (userProfile?.role === 'vendor' && session?.user?.id) {
        const { data: vendorRes } = await supabase.from('restaurants').select('name').eq('vendor_id', session.user.id);
        const names = vendorRes?.map(r => r.name) || [];
        setIotData(merged.filter(d => names.includes(d.restaurant_name)));
      } else {
        setIotData(merged);
      }
    }
  }, [userProfile, session]);

  const fetchUsers = useCallback(async () => {
    if (userProfile?.role !== 'admin') return;
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
  }, [userProfile]);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.3152&longitude=44.3661&current_weather=true');
      const data = await res.json();
      if (data?.current_weather?.temperature) setOutsideTemp(data.current_weather.temperature);
    } catch (e) { console.error('Weather fetch error', e); }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Hardcoded Admin Bypass
    if (authForm.email === 'admin@gmail.com' && authForm.password === 'admin123') {
      localStorage.setItem('admin_bypass', 'true');
      const mockSession = { user: { id: 'admin-bypass', email: 'admin@gmail.com' } };
      const mockProfile = { id: 'admin-bypass', role: 'admin', full_name: 'Super Admin', email: 'admin@gmail.com' };
      setSession(mockSession);
      setUserProfile(mockProfile as any);
      setLoading(false);
      showToast(lang === 'ku' ? 'بەخێربێیت بەڕێوەبەر!' : 'Welcome Super Admin!');
      return;
    }

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });
    
    if (error) { 
      showToast(error.message, 'error');
      setLoading(false);
      return;
    }

    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
      if (!profile || !['admin', 'vendor'].includes(profile.role)) {
        await supabase.auth.signOut();
        showToast(lang === 'ku' ? 'تۆ مۆڵەتی چوونەژوورەوەت نییە بۆ ئەم پانێڵە' : 'You do not have permission to access this panel', 'error');
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('admin_bypass');
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        if (profile && ['admin', 'vendor'].includes(profile.role)) {
          setSession(session);
          setUserProfile(profile);
        } else {
          await supabase.auth.signOut();
        }
      }
      setIsAuthLoading(false);
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        if (profile && ['admin', 'vendor'].includes(profile.role)) {
          setSession(session);
          setUserProfile(profile);
        } else {
          await supabase.auth.signOut();
          setSession(null);
          setUserProfile(null);
        }
      } else {
        setSession(null);
        setUserProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !userProfile) return;
    fetchRestaurants(); fetchMenu(); fetchOrders(); fetchIoT(); fetchUsers(); fetchWeather();
    const ch = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_tracking' }, fetchIoT)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, fetchRestaurants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, fetchMenu)
      .subscribe();
    const iotInterval = setInterval(fetchIoT, 15000);
    return () => { supabase.removeChannel(ch); clearInterval(iotInterval); };
  }, [session, userProfile, fetchRestaurants, fetchMenu, fetchOrders, fetchIoT, fetchUsers, fetchWeather]);

  useEffect(() => {
    if (tab === 'my-restaurant' && userProfile?.role === 'vendor' && restaurants.length > 0) {
      const r = restaurants[0];
      setResForm({
        name: r.name,
        description: r.description || '',
        phone: r.phone,
        address: r.address,
        city: r.city,
        latitude: String(r.latitude || ''),
        longitude: String(r.longitude || ''),
        cuisine_type: r.cuisine_type || '',
        delivery_fee: String(r.delivery_fee),
        minimum_order: String(r.minimum_order),
        estimated_delivery_time: String(r.estimated_delivery_time),
        opening_time: r.opening_time || '',
        closing_time: r.closing_time || '',
        status: r.status,
        image_url: r.image_url || '',
        vendor_id: r.vendor_id || '',
        imageFile: null
      });
      setEditId(r.id);
    }
  }, [tab, userProfile, restaurants]);

  // ── Restaurant CRUD ───────────────────────────────────────────────
  const openAddRestaurant = () => {
    setEditId(null);
    setResForm({ name: '', description: '', phone: '', address: '', city: '', latitude: '', longitude: '', cuisine_type: '', delivery_fee: '', minimum_order: '', estimated_delivery_time: '30', opening_time: '', closing_time: '', status: 'pending_approval', image_url: '', vendor_id: '', imageFile: null });
    setModal('restaurant');
  };
  const openEditRestaurant = (r: Restaurant) => {
    setEditId(r.id);
    setResForm({ name: r.name, description: r.description || '', phone: r.phone, address: r.address, city: r.city, latitude: String(r.latitude || ''), longitude: String(r.longitude || ''), cuisine_type: r.cuisine_type || '', delivery_fee: String(r.delivery_fee), minimum_order: String(r.minimum_order), estimated_delivery_time: String(r.estimated_delivery_time), opening_time: r.opening_time || '', closing_time: r.closing_time || '', status: r.status, image_url: r.image_url || '', vendor_id: r.vendor_id || '', imageFile: null });
    setModal('restaurant');
  };
  const uploadFile = async (file: File, bucket: string) => {
    const ext = file.name.split('.').pop();
    const name = `${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).upload(name, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  };

  const saveRestaurant = async () => {
    if (!resForm.name || !resForm.phone) { showToast('Name and phone are required', 'error'); return; }
    setLoading(true);
    let finalImageUrl = resForm.image_url;
    if (resForm.imageFile) {
      try {
        finalImageUrl = await uploadFile(resForm.imageFile, 'restaurants');
      } catch (err: any) {
        showToast('Upload Error: ' + err.message, 'error');
        setLoading(false); return;
      }
    }

    const payload = { 
      name: resForm.name, 
      description: resForm.description,
      phone: resForm.phone, 
      address: resForm.address, 
      city: resForm.city, 
      latitude: parseFloat(resForm.latitude) || null,
      longitude: parseFloat(resForm.longitude) || null,
      cuisine_type: resForm.cuisine_type, 
      delivery_fee: parseFloat(resForm.delivery_fee) || 0, 
      minimum_order: parseFloat(resForm.minimum_order) || 0, 
      estimated_delivery_time: parseInt(resForm.estimated_delivery_time) || 30, 
      opening_time: resForm.opening_time || null,
      closing_time: resForm.closing_time || null,
      vendor_id: resForm.vendor_id,
      status: resForm.status, 
      image_url: finalImageUrl || null 
    };
    if (editId) {
      const { error } = await supabase.from('restaurants').update(payload).eq('id', editId);
      if (error) { showToast('Error: ' + error.message, 'error'); } else { showToast(t('updated')); }
    } else {
      if (!resForm.vendor_id) { showToast('Please select a vendor', 'error'); setLoading(false); return; }
      const { error } = await supabase.from('restaurants').insert({ ...payload });
      if (error) { showToast('Error: ' + error.message, 'error'); } else { showToast(t('added')); }
    }
    setModal(null); fetchRestaurants(); setLoading(false);
  };
  const deleteRestaurant = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    await supabase.from('restaurants').delete().eq('id', id);
    showToast(t('deleted')); fetchRestaurants(); fetchMenu();
  };
  const updateRestaurantStatus = async (id: string, status: Restaurant['status']) => {
    await supabase.from('restaurants').update({ status }).eq('id', id);
    fetchRestaurants(); showToast(t('updated'));
  };

  // ── Menu CRUD ─────────────────────────────────────────────────────
  const openAddItem = () => {
    setEditId(null);
    // Explicitly take the vendor's restaurant ID if they are a vendor
    const defaultResId = userProfile?.role === 'vendor' ? (restaurants[0]?.id || '') : '';
    setItemForm({ name: '', description: '', price: '', restaurant_id: defaultResId, category_id: '', image_url: '', is_available: true, is_vegetarian: false, preparation_time: '15', imageFile: null });
    setModal('item');
  };
  const openEditItem = (m: MenuItem) => {
    setEditId(m.id);
    setItemForm({ name: m.name, description: m.description || '', price: String(m.price), restaurant_id: m.restaurant_id, category_id: m.category_id || '', image_url: m.image_url || '', is_available: m.is_available, is_vegetarian: m.is_vegetarian, preparation_time: String(m.preparation_time), imageFile: null });
    setModal('item');
  };

  // ── Category CRUD ───────────────────────────────────────────────
  const openAddCategory = () => {
    setEditId(null);
    const defaultResId = userProfile?.role === 'vendor' ? (restaurants[0]?.id || '') : '';
    setCatForm({ name: '', restaurant_id: defaultResId, display_order: '0', is_active: true });
    setModal('category');
  };
  const openEditCategory = (c: MenuCategory) => {
    setEditId(c.id);
    setCatForm({ name: c.name, restaurant_id: c.restaurant_id, display_order: String(c.display_order), is_active: c.is_active });
    setModal('category');
  };
  const saveCategory = async () => {
    let targetResId = catForm.restaurant_id;
    
    // Auto-resolve restaurant ID based on your schema (restaurants.vendor_id -> current user id)
    if (!targetResId && userProfile?.role === 'vendor') {
      // Try from cached state first
      if (restaurants.length > 0) {
        targetResId = restaurants[0].id;
      } else {
        // Fallback: Direct database lookup using profile ID
        const { data: vRest } = await supabase
          .from('restaurants')
          .select('id')
          .eq('vendor_id', userProfile.id)
          .limit(1)
          .single();
        if (vRest) targetResId = vRest.id;
      }
    }

    if (!catForm.name || !targetResId) { 
      const msg = !catForm.name 
        ? (lang === 'ku' ? 'تکایە ناوی پۆل بنووسە' : 'Please provide a Category Name')
        : (lang === 'ku' ? 'چێشتخانەیەک نەدۆزرایەوە بۆ هەژمارەکەت' : 'No restaurant linked to your vendor account found');
      showToast(msg, 'error'); 
      return; 
    }
    
    setLoading(true);
    const payload = { 
      name: catForm.name, 
      restaurant_id: targetResId, 
      display_order: parseInt(catForm.display_order) || 0, 
      is_active: catForm.is_active 
    };
    if (editId) {
      const { error } = await supabase.from('menu_categories').update(payload).eq('id', editId);
      if (error) { showToast('Error: ' + error.message, 'error'); } else { showToast(t('updated')); }
    } else {
      const { error } = await supabase.from('menu_categories').insert(payload);
      if (error) { showToast('Error: ' + error.message, 'error'); } else { showToast(t('added')); }
    }
    setModal(null); fetchMenu(); setLoading(false);
  };
  const deleteCategory = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    const { error } = await supabase.from('menu_categories').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); } else { showToast(t('deleted')); fetchMenu(); }
  };

  const saveItem = async () => {
    let targetResId = itemForm.restaurant_id;
    
    if (!targetResId && userProfile?.role === 'vendor') {
      if (restaurants.length > 0) {
        targetResId = restaurants[0].id;
      } else {
        const { data: vRest } = await supabase
          .from('restaurants')
          .select('id')
          .eq('vendor_id', userProfile.id)
          .limit(1)
          .single();
        if (vRest) targetResId = vRest.id;
      }
    }

    if (!itemForm.name || !itemForm.price || !targetResId) { 
      const missing = [];
      if (!itemForm.name) missing.push(lang === 'ku' ? 'ناو' : 'Name');
      if (!itemForm.price) missing.push(lang === 'ku' ? 'نرخ' : 'Price');
      if (!targetResId) missing.push(lang === 'ku' ? 'چێشتخانە' : 'Restaurant ID');
      showToast(`${lang === 'ku' ? 'تکایە ئەمانە پڕ بکەرەوە:' : 'Please provide:'} ${missing.join(', ')}`, 'error'); 
      return; 
    }
    setLoading(true);

    let finalImageUrl = itemForm.image_url;
    if (itemForm.imageFile) {
      try {
        finalImageUrl = await uploadFile(itemForm.imageFile, 'menu-items');
      } catch (err: any) {
        showToast('Upload Error: ' + err.message, 'error');
        setLoading(false); return;
      }
    }

    const payload = { 
      name: itemForm.name, 
      description: itemForm.description, 
      price: parseFloat(itemForm.price) || 0, 
      restaurant_id: itemForm.restaurant_id, 
      category_id: itemForm.category_id || null, 
      image_url: finalImageUrl || null, 
      is_available: itemForm.is_available, 
      is_vegetarian: itemForm.is_vegetarian, 
      preparation_time: parseInt(itemForm.preparation_time) || 15 
    };

    if (editId) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editId);
      if (error) { showToast('Error: ' + error.message, 'error'); } else { showToast(t('updated')); }
    } else {
      const { error } = await supabase.from('menu_items').insert(payload);
      if (error) { showToast('Error: ' + error.message, 'error'); } else { showToast(t('added')); }
    }
    setModal(null); fetchMenu(); setLoading(false);
  };
  const deleteItem = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    await supabase.from('menu_items').delete().eq('id', id);
    showToast(t('deleted')); fetchMenu();
  };
  const toggleItemAvailability = async (id: string, current: boolean) => {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id);
    fetchMenu();
  };

  // ── Orders ────────────────────────────────────────────────────────
  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders(); showToast(t('updated'));
  };

  // ── Users ────────────────────────────────────────────────────────
  const updateUserRole = async (id: string, role: string) => {
    await supabase.from('user_profiles').update({ role }).eq('id', id);
    fetchUsers(); showToast(t('updated'));
  };
  const toggleUserActive = async (id: string, current: boolean) => {
    await supabase.from('user_profiles').update({ is_active: !current }).eq('id', id);
    fetchUsers(); showToast(t('updated'));
  };

  // ── Derived ───────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o =>
    (orderFilter === 'all' || o.status === orderFilter) &&
    (o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
     o.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     o.customer?.email?.toLowerCase().includes(search.toLowerCase()) ||
     o.restaurant?.name?.toLowerCase().includes(search.toLowerCase()) || !search)
  );
  const filteredMenu = menuItems.filter(m =>
    (!menuFilter || m.restaurant_id === menuFilter) &&
    (m.name?.toLowerCase().includes(search.toLowerCase()) || !search)
  );
  const filteredUsers = users.filter(u =>
    (userFilter === 'all' || u.role === userFilter) &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()) ||
     u.id?.toLowerCase().includes(search.toLowerCase()) || !search)
  );
  const filteredRestaurants = restaurants.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.city?.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine_type?.toLowerCase().includes(search.toLowerCase()) || !search
  );

  const orderStats = {
    total: orders.length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    inTransit: orders.filter(o => o.status === 'in_transit' || o.status === 'picked_up').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };
  const onlineDevices = iotData.filter(d => d.is_pack_online).length;

  const tabItems: { key: typeof tab; icon: string; labelEn: string; labelKu: string; badge?: number }[] = [
    { key: 'iot', icon: '📡', labelEn: 'IoT Monitor', labelKu: 'چاودێری IoT', badge: onlineDevices || undefined },
    { key: 'restaurants', icon: '🏪', labelEn: 'Restaurants', labelKu: 'چێشتخانەکان', badge: restaurants.filter(r => r.status === 'pending_approval').length || undefined },
    { key: 'categories', icon: '📁', labelEn: 'Categories', labelKu: 'پۆلەکان', badge: undefined },
    { key: 'menu', icon: '🍽️', labelEn: 'Menu Items', labelKu: 'مینیو', badge: undefined },
    { key: 'orders', icon: '📦', labelEn: 'Live Orders', labelKu: 'داواکاریەکان', badge: (orderStats.preparing + orderStats.inTransit) || undefined },
    { key: 'users', icon: '👥', labelEn: 'Users', labelKu: 'بەکارهێنەران', badge: undefined },
    { key: 'my-restaurant', icon: '🏪', labelEn: 'My Restaurant', labelKu: 'چێشتخانەکەم', badge: undefined },
  ].filter(item => {
    if (userProfile?.role === 'vendor') {
      return !['restaurants', 'users'].includes(item.key);
    }
    if (userProfile?.role === 'admin') {
      return item.key !== 'my-restaurant';
    }
    return true;
  }) as any;

  // ── Render ────────────────────────────────────────────────────────
  if (isAuthLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nav)', color: '#fff' }}>Loading...</div>;

  if (!session) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundImage: 'url("/login-bg.png")', 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: 20,
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(11,25,41,0.8), rgba(249,115,22,0.2))', backdropFilter: 'blur(2px)' }} />
        
        <style>{`
          .login-card{
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 30px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255,255,255,0.3);
            position: relative;
            z-index: 10;
            animation: slideUp 0.6s ease-out;
          }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          
          .login-logo{
            font-size: 38px;
            font-weight: 900;
            background: linear-gradient(135deg, var(--accent), var(--accent2));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-align: center;
            margin-bottom: 4px;
            letter-spacing: -1.5px;
          }
          .login-sub{text-align:center;color:#334155;font-size:14px;margin-bottom:35px;font-weight:600}
          
          .login-input-group{margin-bottom:20px}
          .login-input-group label{color:#0f172a;font-weight:700}
          .login-input{
            width:100%;
            padding:12px 16px;
            background: rgba(241, 245, 249, 0.7);
            border: 2px solid transparent;
            border-radius: 14px;
            font-size: 14px;
            color: #0f172a;
            transition: all 0.2s;
            outline: none;
            font-weight: 500;
          }
          .login-input:focus{
            border-color: var(--accent);
            background: #fff;
            box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
          }
          .login-btn{
            width:100%;
            padding:14px;
            background: linear-gradient(135deg, var(--accent), var(--accent2));
            color: #fff;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);
            margin-top: 10px;
          }
          .login-btn:hover{transform: translateY(-2px); box-shadow: 0 15px 20px -5px rgba(249, 115, 22, 0.4);}
          .login-btn:active{transform: translateY(0);}
          .login-lang{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(0,0,0,0.1);
            color: #475569;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: color 0.2s;
          }
          .login-lang:hover{color: #0f172a;}
        `}</style>

        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 44 }}>🍔</span>
          </div>
          <div className="login-logo">FoodAdmin</div>
          <div className="login-sub">{lang === 'ku' ? 'خۆشحاڵین بە دووبارە گەڕانەوەت' : 'Welcome back! Please sign in'}</div>
          
          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>{lang === 'ku' ? 'ئیمەیڵ' : 'Email Address'}</label>
              <input className="login-input" type="email" required placeholder="admin@ferbaxsha.com" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="login-input-group">
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>{lang === 'ku' ? 'وشەی تێپەڕ' : 'Password'}</label>
              <input className="login-input" type="password" required placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? (lang === 'ku' ? 'چاوەڕێبە…' : 'Signing In...') : (lang === 'ku' ? 'چوونەژوورەوە' : 'Sign In')}
            </button>
          </form>

          <div className="login-lang" onClick={() => setLang(lang === 'en' ? 'ku' : 'en')}>
            <span style={{ fontSize: 16 }}>🌐</span>
            {lang === 'en' ? 'گۆڕین بۆ کوردی' : 'Switch to English'}
          </div>
        </div>

        <div className={`toast${toast ? ' show' : ''} ${toastType === 'error' ? 'toast-error' : 'toast-success'}`} dir={dir}>
          {toastType === 'success' ? '✓ ' : '✕ '}{toast}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --nav:#0b1929;--nav2:#0f2236;--nav3:#152d45;
          --accent:#f97316;--accent2:#ea580c;--accent3:#fed7aa;
          --teal:#0ea5e9;--teal2:#0284c7;
          --bg:#f1f5f9;--surface:#fff;--surface2:#f8fafc;--border:#e2e8f0;--border2:#cbd5e1;
          --text:#0f172a;--muted:#64748b;--faint:#94a3b8;
          --green:#10b981;--amber:#f59e0b;--red:#ef4444;--blue:#3b82f6;--purple:#8b5cf6;
          --shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
          --shadow-md:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06);
          --shadow-lg:0 10px 25px -3px rgba(0,0,0,.12),0 4px 6px -2px rgba(0,0,0,.05);
        }
        body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text)}
        [dir="rtl"] body{font-family:'Noto Sans Arabic','Plus Jakarta Sans',sans-serif}
        [dir="rtl"] *{font-family:'Noto Sans Arabic','Plus Jakarta Sans',sans-serif}

        /* Layout */
        .layout{display:flex;height:100vh;overflow:hidden}

        /* Sidebar */
        .sidebar{width:230px;background:var(--nav);display:flex;flex-direction:column;flex-shrink:0;transition:width .2s}
        .brand{padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,.06)}
        .brand-row{display:flex;align-items:center;gap:10px}
        .brand-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--accent),#c2410c);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px rgba(249,115,22,.4)}
        .brand-name{color:#fff;font-weight:800;font-size:15px;letter-spacing:-.3px}
        .brand-sub{color:rgba(255,255,255,.3);font-size:10px;margin-top:1px;letter-spacing:.05em;text-transform:uppercase}

        .nav-sec{padding:18px 16px 6px;font-size:9px;font-weight:700;color:rgba(255,255,255,.2);letter-spacing:.12em;text-transform:uppercase}
        .nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;margin:1px 8px;cursor:pointer;color:rgba(255,255,255,.4);font-size:13px;font-weight:500;transition:all .15s;position:relative;border:none;background:none;width:calc(100% - 16px);text-align:left}
        [dir="rtl"] .nav-item{text-align:right}
        .nav-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.75)}
        .nav-item.active{background:linear-gradient(90deg,rgba(249,115,22,.2),rgba(249,115,22,.05));color:var(--accent);border:1px solid rgba(249,115,22,.2)}
        .nav-item.active .nav-icon{filter:drop-shadow(0 0 4px rgba(249,115,22,.6))}
        .nav-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0}
        .nav-badge{margin-left:auto;background:var(--accent);color:#fff;font-size:10px;padding:1px 7px;border-radius:10px;font-weight:700;min-width:20px;text-align:center}
        [dir="rtl"] .nav-badge{margin-left:0;margin-right:auto}
        .nav-divider{height:1px;background:rgba(255,255,255,.06);margin:8px 16px}
        .nav-bottom{margin-top:auto;padding:14px 16px;border-top:1px solid rgba(255,255,255,.06)}
        .lang-btn{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;letter-spacing:.03em}
        .lang-btn:hover{background:rgba(255,255,255,.1);color:#fff}
        .lang-globe{font-size:15px}

        /* Main */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:16px}
        .page-title{font-size:18px;font-weight:800;letter-spacing:-.4px}
        .breadcrumb{font-size:12px;color:var(--muted);margin-top:1px}
        .topbar-right{display:flex;align-items:center;gap:12px}
        .search-wrap{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:7px 13px;width:260px;transition:border .15s}
        .search-wrap:focus-within{border-color:var(--teal);background:#fff}
        .search-wrap input{background:none;border:none;outline:none;font-size:13px;color:var(--text);width:100%;font-family:inherit}
        .search-wrap input::placeholder{color:var(--faint)}
        .live-dot{width:8px;height:8px;background:var(--green);border-radius:50%;box-shadow:0 0 0 3px rgba(16,185,129,.2);animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 3px rgba(16,185,129,.2)}50%{box-shadow:0 0 0 5px rgba(16,185,129,.1)}}
        .live-label{font-size:11px;font-weight:700;color:var(--green);letter-spacing:.05em}

        /* Content */
        .content{flex:1;overflow-y:auto;padding:22px 24px}
        .panel{display:none}.panel.active{display:block}

        /* Section headers */
        .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px}
        .section-title{font-size:16px;font-weight:800;letter-spacing:-.3px}
        .section-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

        /* Stats */
        .stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:22px}
        .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow);transition:transform .15s,box-shadow .15s}
        .stat-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
        .stat-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;margin-bottom:10px}
        .stat-label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
        .stat-val{font-size:26px;font-weight:800;line-height:1.1;margin-top:3px;letter-spacing:-.5px}
        .stat-sub{font-size:11px;color:var(--faint);margin-top:3px}

        /* Cards */
        .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}
        .card-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .card-title{font-size:14px;font-weight:700}

        /* Table */
        .table-wrap{overflow-x:auto}
        table{width:100%;border-collapse:collapse}
        th{padding:10px 14px;text-align:left;font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap}
        [dir="rtl"] th,[dir="rtl"] td{text-align:right}
        td{padding:12px 14px;border-bottom:1px solid var(--border);font-size:13px;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#fafbfc}
        .td-bold{font-weight:600}
        .td-muted{color:var(--muted);font-size:12px}

        /* Badges */
        .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap}
        .badge::before{content:'';width:5px;height:5px;border-radius:50%;flex-shrink:0}
        .badge-green{background:#dcfce7;color:#15803d}.badge-green::before{background:#16a34a}
        .badge-amber{background:#fef3c7;color:#b45309}.badge-amber::before{background:#d97706}
        .badge-red{background:#fee2e2;color:#b91c1c}.badge-red::before{background:#ef4444}
        .badge-blue{background:#dbeafe;color:#1d4ed8}.badge-blue::before{background:#3b82f6}
        .badge-purple{background:#ede9fe;color:#6d28d9}.badge-purple::before{background:#8b5cf6}
        .badge-gray{background:#f1f5f9;color:#475569}.badge-gray::before{background:#94a3b8}

        /* Buttons */
        .btn{display:inline-flex;align-items:center;gap:5px;padding:8px 15px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:inherit;white-space:nowrap}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 2px 8px rgba(249,115,22,.35)}
        .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(249,115,22,.4)}
        .btn-teal{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;box-shadow:0 2px 8px rgba(14,165,233,.35)}
        .btn-teal:hover:not(:disabled){transform:translateY(-1px)}
        .btn-outline{background:var(--surface);border:1.5px solid var(--border2);color:var(--text)}.btn-outline:hover{background:var(--surface2);border-color:var(--text)}
        .btn-ghost-blue{background:none;border:1.5px solid #bfdbfe;color:#2563eb;padding:4px 10px;font-size:12px}.btn-ghost-blue:hover{background:#eff6ff}
        .btn-ghost-red{background:none;border:1.5px solid #fecaca;color:#dc2626;padding:4px 10px;font-size:12px}.btn-ghost-red:hover{background:#fef2f2}
        .btn-ghost-green{background:none;border:1.5px solid #bbf7d0;color:#15803d;padding:4px 10px;font-size:12px}.btn-ghost-green:hover{background:#f0fdf4}
        .btn-ghost-amber{background:none;border:1.5px solid #fde68a;color:#b45309;padding:4px 10px;font-size:12px}.btn-ghost-amber:hover{background:#fffbeb}
        .btn-sm{padding:5px 10px;font-size:12px;border-radius:7px}
        .action-row{display:flex;gap:5px;align-items:center;flex-wrap:wrap}

        /* IoT Grid */
        .iot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:24px}
        .iot-card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:18px;position:relative;overflow:hidden;transition:all .2s;cursor:pointer}
        .iot-card:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
        .iot-card.online{border-color:#a7f3d0;background:linear-gradient(135deg,#fff,#f0fdf4)}
        .iot-card.offline{border-color:#fecaca;opacity:.6}
        .iot-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .iot-status-row{display:flex;align-items:center;gap:6px}
        .iot-status-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .dot-online{background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.2);animation:pulse 2s infinite}
        .dot-offline{background:#ef4444}
        .iot-status-text{font-size:11px;font-weight:700;letter-spacing:.05em}
        .iot-temp-big{font-size:42px;font-weight:800;letter-spacing:-1px;line-height:1}
        .iot-temp-unit{font-size:20px;font-weight:600;color:var(--muted)}
        .iot-info-row{display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:8px;flex-wrap:wrap}
        .iot-info-item{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px}
        .progress-bar{height:4px;border-radius:2px;background:#e2e8f0;overflow:hidden;margin-top:4px}
        .progress-fill{height:100%;border-radius:2px;transition:width .4s}
        .camera-stream{width:100%;aspect-ratio:16/9;border-radius:10px;background:#0b1929;object-fit:cover;border:1px solid var(--border);margin-top:10px}
        .no-stream{width:100%;aspect-ratio:16/9;border-radius:10px;background:linear-gradient(135deg,#0b1929,#1e293b);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;margin-top:10px}
        .no-stream-icon{font-size:32px;opacity:.5}
        .no-stream-text{font-size:11px;color:rgba(255,255,255,.3);font-weight:600;letter-spacing:.05em}

        /* Menu Grid */
        .menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
        .menu-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:all .2s;box-shadow:var(--shadow)}
        .menu-card:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
        .menu-img{height:130px;background:var(--surface2);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:44px}
        .menu-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .menu-body{padding:12px 14px}
        .menu-name{font-weight:700;font-size:14px;margin-bottom:2px;letter-spacing:-.2px}
        .menu-price{color:var(--accent);font-weight:800;font-size:14px}
        .menu-meta{color:var(--muted);font-size:11px;margin-top:5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
        .menu-tag{background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:1px 7px;font-size:10px;font-weight:600;color:var(--muted)}
        .menu-actions{padding:9px 12px;border-top:1px solid var(--border);display:flex;gap:6px}
        .unavail-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;letter-spacing:.05em}

        /* Modal */
        .overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(2px);z-index:200;align-items:center;justify-content:center;padding:16px}
        .overlay.open{display:flex}
        .modal{background:var(--surface);border-radius:18px;padding:28px;width:520px;max-width:100%;box-shadow:var(--shadow-lg),0 0 0 1px rgba(255,255,255,.1);position:relative;max-height:90vh;overflow-y:auto}
        .modal-lg{width:700px}
        .modal-title{font-size:17px;font-weight:800;margin-bottom:22px;letter-spacing:-.3px}
        .form-group{margin-bottom:15px}
        .form-label{font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px;display:block}
        .form-input{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;font-size:13px;font-family:inherit;color:var(--text);background:var(--surface);outline:none;transition:border .15s}
        .form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(249,115,22,.1)}
        textarea.form-input{resize:vertical;min-height:80px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .form-check{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;font-weight:500}
        .form-check input[type="checkbox"]{width:15px;height:15px;cursor:pointer;accent-color:var(--accent)}
        .modal-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:18px;border-top:1px solid var(--border)}
        .close-x{position:absolute;top:16px;right:16px;background:var(--surface2);border:1.5px solid var(--border);cursor:pointer;color:var(--muted);padding:5px 8px;border-radius:8px;font-size:16px;line-height:1;font-weight:600;transition:all .15s}
        [dir="rtl"] .close-x{right:auto;left:16px}
        .close-x:hover{background:var(--bg);color:var(--text)}

        /* Order detail */
        .detail-section{margin-bottom:16px;padding:14px;background:var(--surface2);border-radius:11px}
        .detail-sec-title{font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
        .detail-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid var(--border)}
        .detail-row:last-child{border-bottom:none}
        .detail-total{display:flex;justify-content:space-between;font-size:15px;font-weight:800;padding:12px 14px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:11px;margin-top:10px}

        /* Filter tabs */
        .filter-tabs{display:flex;gap:4px;flex-wrap:wrap}
        .filter-tab{padding:5px 13px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:var(--surface);color:var(--muted);transition:all .15s;font-family:inherit}
        .filter-tab.active{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 2px 8px rgba(249,115,22,.3)}
        .filter-tab:hover:not(.active){background:var(--surface2)}

        /* Toast */
        .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:12px;font-size:13px;z-index:999;pointer-events:none;transition:all .25s;transform:translateY(14px);opacity:0;font-weight:600;box-shadow:var(--shadow-lg)}
        [dir="rtl"] .toast{right:auto;left:24px}
        .toast.show{transform:translateY(0);opacity:1}
        .toast-success{background:#0f172a;color:#fff}
        .toast-error{background:#7f1d1d;color:#fecaca}

        /* Chip */
        .chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:var(--surface2);border:1px solid var(--border);color:var(--muted)}

        /* Restaurant card */
        .res-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        .res-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--shadow);transition:all .2s}
        .res-card:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
        .res-img{height:140px;background:linear-gradient(135deg,var(--nav),var(--nav3));position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:48px}
        .res-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .res-body{padding:14px 16px}
        .res-name{font-weight:800;font-size:15px;letter-spacing:-.3px;margin-bottom:2px}
        .res-meta{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px}
        .res-meta-item{display:flex;align-items:center;gap:3px}
        .res-footer{padding:10px 16px;border-top:1px solid var(--border);display:flex;gap:6px;justify-content:space-between;align-items:center;background:var(--surface2)}
        .res-stat{font-size:11px;color:var(--muted);text-align:center}
        .res-stat-val{font-size:14px;font-weight:800;color:var(--text);display:block}

        /* User list */
        .user-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#c2410c);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0}

        /* Empty state */
        .empty{text-align:center;padding:56px 24px;color:var(--muted)}
        .empty-icon{font-size:48px;margin-bottom:12px;opacity:.4}
        .empty-text{font-size:14px;font-weight:600}
        .empty-sub{font-size:12px;margin-top:4px;color:var(--faint)}

        /* Status select */
        select.form-input{cursor:pointer;appearance:auto}

        /* Quick tabs (top-of-content) */
        .quick-tabs{display:flex;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:11px;padding:3px;margin-bottom:20px;flex-wrap:nowrap;overflow-x:auto}
        .quick-tab{flex:1;min-width:fit-content;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:none;color:var(--muted);transition:all .15s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
        .quick-tab.active{background:var(--surface);color:var(--text);box-shadow:var(--shadow)}
        .quick-tab-badge{background:var(--accent);color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:800}

        /* Scrollbar */
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}

        @media(max-width:768px){
          .sidebar{display:none}
          .form-row{grid-template-columns:1fr}
          .res-grid,.iot-grid{grid-template-columns:1fr}
          .quick-tabs{gap:1px}
          .quick-tab{padding:8px 10px;font-size:11px}
        }
      `}</style>

      <div className="layout" dir={dir}>
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="sidebar">
          <div className="brand">
            <div className="brand-row">
              <div className="brand-icon">🍔</div>
              <div>
                <div className="brand-name">{lang === 'ku' ? 'خواردن ئەدمین' : 'FoodAdmin'}</div>
                <div className="brand-sub">{userProfile?.role === 'vendor' ? (lang === 'ku' ? 'پانێڵی فرۆشندە' : 'Vendor Panel') : (lang === 'ku' ? 'سوپەر ئەدمین' : 'Super Admin')}</div>
              </div>
            </div>
          </div>

          <div className="nav-sec">{lang === 'ku' ? 'مەنیوی سەرەکی' : 'Main Menu'}</div>
          {tabItems.map(({ key, icon, labelEn, labelKu, badge }) => (
            <button key={key} className={`nav-item${tab === key ? ' active' : ''}`}
              onClick={() => { setTab(key); setSearch(''); }}>
              <span className="nav-icon">{icon}</span>
              <span>{lang === 'ku' ? labelKu : labelEn}</span>
              {badge && badge > 0 ? <span className="nav-badge">{badge}</span> : null}
            </button>
          ))}

          <div className="nav-divider" />
          <div style={{ padding: '4px 16px 10px', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'ku' ? 'بەکارهێنەر' : 'Account'}
          </div>
          <div style={{ margin: '0 8px 8px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--nav3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              👤
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userProfile?.full_name || 'User'}</div>
              <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase' }}>{userProfile?.role}</div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>{lang === 'ku' ? 'چوونەدەرەوە' : 'Logout'}</span>
          </button>
          <div className="nav-bottom">
            <button className="lang-btn" onClick={() => setLang(l => l === 'en' ? 'ku' : 'en')}>
              <span className="lang-globe">🌐</span>
              <span>{lang === 'en' ? 'کوردی' : 'English'}</span>
            </button>
          </div>
        </div>

        {/* ── Main ─────────────────────────────────────────────────── */}
        <div className="main">
          {/* Topbar */}
          <div className="topbar">
            <div>
              <div className="page-title">
                {tabItems.find(x => x.key === tab)?.[lang === 'ku' ? 'labelKu' : 'labelEn']}
              </div>
              <div className="breadcrumb">
                {lang === 'ku' ? 'داشبۆرد' : 'Dashboard'} / {tabItems.find(x => x.key === tab)?.[lang === 'ku' ? 'labelKu' : 'labelEn']}
              </div>
            </div>
            <div className="topbar-right">
              {/* Live indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="live-dot" />
                <span className="live-label">{lang === 'ku' ? 'زیندوو' : 'LIVE'}</span>
              </div>
              {/* Search */}
              <div className="search-wrap">
                <span style={{ fontSize: 14, color: 'var(--faint)' }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={lang === 'ku' ? 'گەڕان لە هەموو شتێک…' : 'Search everything…'}
                />
                {search && <span style={{ cursor: 'pointer', color: 'var(--faint)', fontSize: 13 }} onClick={() => setSearch('')}>✕</span>}
              </div>
            </div>
          </div>

          {/* Quick Tabs */}
          <div style={{ padding: '10px 24px 0', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div className="quick-tabs">
              {tabItems.map(({ key, icon, labelEn, labelKu, badge }) => (
                <button key={key} className={`quick-tab${tab === key ? ' active' : ''}`}
                  onClick={() => { setTab(key); setSearch(''); }}>
                  {icon} {lang === 'ku' ? labelKu : labelEn}
                  {badge && badge > 0 ? <span className="quick-tab-badge">{badge}</span> : null}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="content">

            {/*  IoT Panel  */}
            <div className={`panel${tab === 'iot' ? ' active' : ''}`}>
              {/* Stats */}
              <div className="stat-grid">
                {[
                  { icon: '📡', label: lang === 'ku' ? 'ئامێرە ئۆنلاینەکان' : 'Online Devices', val: onlineDevices, sub: `${iotData.length} ${lang === 'ku' ? 'کۆ' : 'total'}`, color: '#dcfce7', iconBg: '#166534' },
                  { icon: '🌡️', label: lang === 'ku' ? 'پلەی گەرمی ناوەندی' : 'Avg Temperature', val: (iotData.length && onlineDevices > 0) ? Math.round(iotData.filter(d => d.is_pack_online).reduce((s, d) => s + (d.current_temp || 0), 0) / (onlineDevices || 1)) + '°C' : (outsideTemp !== null ? outsideTemp + '°C' : '—'), sub: outsideTemp !== null ? `${lang === 'ku' ? 'دەرەوە:' : 'Outside:'} ${outsideTemp}°C` : (lang === 'ku' ? 'نرخی ئۆنلاینەکان' : 'Online devices avg'), color: '#dbeafe', iconBg: '#1e40af' },
                  { icon: '📦', label: lang === 'ku' ? 'داواکاریەکانی لە ڕێگا' : 'In Transit', val: orderStats.inTransit, sub: lang === 'ku' ? 'لە گەیاندنی چالاک' : 'Active deliveries', color: '#ede9fe', iconBg: '#6d28d9' },
                  { icon: '✅', label: lang === 'ku' ? 'گەیشتووەکان ئەمڕۆ' : 'Delivered Today', val: orderStats.delivered, sub: lang === 'ku' ? 'داواکاری تەواوبوو' : 'Completed orders', color: '#dcfce7', iconBg: '#15803d' },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-icon" style={{ background: s.color }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                    </div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val" style={{ fontWeight: 800 }}>{s.val}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="section-header">
                <div className="section-title">{lang === 'ku' ? 'شوێنکەوتنی IoT زیندوو' : 'Live IoT Tracking'}</div>
                <button className="btn btn-outline btn-sm" onClick={fetchIoT}>↻ {lang === 'ku' ? 'نوێکردنەوە' : 'Refresh'}</button>
              </div>

              {iotData.length === 0 ? (
                <div className="empty"><div className="empty-icon">📡</div><div className="empty-text">{lang === 'ku' ? 'ئامێرێکی ئۆنلاین نییە' : 'No devices online'}</div><div className="empty-sub">{lang === 'ku' ? 'کاتێک داواکاری لە گەیاندن بێت ئامێرەکان دیاری دەبن' : 'Devices appear when deliveries are active'}</div></div>
              ) : (
                <div className="iot-grid">
                  {iotData.map((d, i) => (
                    <div key={i} className={`iot-card${d.is_pack_online ? ' online' : ' offline'}`}
                      onClick={() => { setSelectedIot(d); setModal('iot-detail'); }}>
                      <div className="iot-card-header">
                        <div className="iot-status-row">
                          <div className={`iot-status-dot ${d.is_pack_online ? 'dot-online' : 'dot-offline'}`} />
                          <span className="iot-status-text" style={{ color: d.is_pack_online ? 'var(--green)' : 'var(--red)' }}>
                            {d.is_pack_online ? (lang === 'ku' ? 'ئۆنلاین' : 'ONLINE') : (lang === 'ku' ? 'ئۆفلاین' : 'OFFLINE')}
                          </span>
                        </div>
                        <span className="chip">#{d.order_number || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span className="iot-temp-big" style={{ color: tempColor(d.current_temp) }}>{d.current_temp ?? '—'}</span>
                        <span className="iot-temp-unit">°C</span>
                      </div>
                      <div className="iot-info-row">
                        <span className="iot-info-item">🏪 {d.restaurant_name || '—'}</span>
                        <span className="iot-info-item">🚗 {d.driver_name || '—'}</span>
                      </div>
                      {d.battery_percentage !== undefined && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>🔋 {lang === 'ku' ? 'بەتەری' : 'Battery'}</span>
                            <span style={{ fontWeight: 700 }}>{d.battery_percentage}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${d.battery_percentage}%`, background: d.battery_percentage > 50 ? 'var(--green)' : d.battery_percentage > 20 ? 'var(--amber)' : 'var(--red)' }} />
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>
                        {lang === 'ku' ? 'دوایین نوێکردنەوە:' : 'Updated:'} {d.last_update ? timeAgo(d.last_update, lang) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/*  Restaurants Panel  */}
            <div className={`panel${tab === 'restaurants' ? ' active' : ''}`}>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
                {[
                  { icon: '🏪', label: lang === 'ku' ? 'کۆی گشتی' : 'Total', val: restaurants.length, color: '#dbeafe' },
                  { icon: '✅', label: lang === 'ku' ? 'چالاک' : 'Active', val: restaurants.filter(r => r.status === 'active').length, color: '#dcfce7' },
                  { icon: '⏳', label: lang === 'ku' ? 'چاوەڕوان' : 'Pending', val: restaurants.filter(r => r.status === 'pending_approval').length, color: '#fef3c7' },
                  { icon: '❌', label: lang === 'ku' ? 'ناچالاک' : 'Inactive', val: restaurants.filter(r => r.status === 'inactive').length, color: '#fee2e2' },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val" style={{ fontSize: 22 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="section-header">
                <div>
                  <div className="section-title">{lang === 'ku' ? 'چێشتخانەکان' : 'Restaurants'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{filteredRestaurants.length} {lang === 'ku' ? 'ئەنجام' : 'results'}</div>
                </div>
                <button className="btn btn-primary" onClick={openAddRestaurant}>
                  + {lang === 'ku' ? 'زیادکردنی چێشتخانە' : 'Add Restaurant'}
                </button>
              </div>

              <div className="card">
                <div className="table-wrap">
                  {filteredRestaurants.length === 0 ? (
                    <div className="empty"><div className="empty-icon">🏪</div><div className="empty-text">{lang === 'ku' ? 'چێشتخانەیەک نەدۆزرایەوە' : 'No restaurants found'}</div></div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>{lang === 'ku' ? 'چێشتخانە' : 'Restaurant'}</th>
                          <th>{lang === 'ku' ? 'ناونیشان' : 'Location'}</th>
                          <th>{lang === 'ku' ? 'تەلەفۆن' : 'Contact'}</th>
                          <th>{lang === 'ku' ? 'جۆر' : 'Cuisine'}</th>
                          <th>{lang === 'ku' ? 'دۆخ' : 'Status'}</th>
                          <th>{lang === 'ku' ? 'هەڵسەنگاندن' : 'Rating'}</th>
                          <th>{lang === 'ku' ? 'کردارەکان' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRestaurants.map(r => (
                          <tr key={r.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="user-avatar" style={{ borderRadius: '8px', background: 'var(--nav)', width: 34, height: 34 }}>
                                  {r.image_url ? <img src={r.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} onError={e => e.currentTarget.style.display='none'} /> : '🏪'}
                                </div>
                                <div>
                                  <div className="td-bold">{r.name}</div>
                                  <div className="td-muted" style={{ fontSize: 10 }}>{r.id.slice(0,8)}…</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="td-bold">{r.city}</div>
                              <div className="td-muted">{r.address}</div>
                            </td>
                            <td className="td-muted">{r.phone}</td>
                            <td><span className="chip">{r.cuisine_type || '—'}</span></td>
                            <td>
                              <span className={`badge ${statusColors[r.status] || 'badge-gray'}`}>
                                {statusLabel[r.status]?.[lang] || r.status}
                              </span>
                            </td>
                            <td>
                              <div className="td-bold">⭐ {r.rating?.toFixed(1) || '0.0'}</div>
                              <div className="td-muted" style={{ fontSize: 10 }}>{r.total_reviews || 0} {lang === 'ku' ? 'بۆچوون' : 'reviews'}</div>
                            </td>
                            <td>
                              <div className="action-row">
                                <button className="btn btn-ghost-blue btn-sm" onClick={() => openEditRestaurant(r)}>✏️</button>
                                {r.status !== 'active' && <button className="btn btn-ghost-green btn-sm" onClick={() => updateRestaurantStatus(r.id, 'active')}>✓</button>}
                                {r.status === 'active' && <button className="btn btn-ghost-amber btn-sm" onClick={() => updateRestaurantStatus(r.id, 'inactive')}>⏸</button>}
                                <button className="btn btn-ghost-red btn-sm" onClick={() => deleteRestaurant(r.id)}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/*  Categories Panel  */}
            <div className={`panel${tab === 'categories' ? ' active' : ''}`}>
              <div className="section-header">
                <div>
                  <div className="section-title">{lang === 'ku' ? 'پۆلەکانی مینیو' : 'Menu Categories'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{categories.length} {lang === 'ku' ? 'پۆل' : 'categories'}</div>
                </div>
                <button className="btn btn-primary" onClick={openAddCategory}>
                  + {lang === 'ku' ? 'زیادکردنی پۆل' : 'Add Category'}
                </button>
              </div>

              <div className="card">
                <div className="table-wrap">
                  {categories.length === 0 ? (
                    <div className="empty"><div className="empty-icon">📁</div><div className="empty-text">{lang === 'ku' ? 'هیچ پۆلێک نەدۆزرایەوە' : 'No categories found'}</div></div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>{lang === 'ku' ? 'ناوی پۆل' : 'Category Name'}</th>
                          <th>{lang === 'ku' ? 'چێشتخانە' : 'Restaurant'}</th>
                          <th>{lang === 'ku' ? 'ڕیزبەندی' : 'Order'}</th>
                          <th>{lang === 'ku' ? 'دۆخ' : 'Status'}</th>
                          <th>{lang === 'ku' ? 'کردارەکان' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((c, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                            <td>{restaurants.find(r => r.id === c.restaurant_id)?.name || '—'}</td>
                            <td>{c.display_order}</td>
                            <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? (lang === 'ku' ? 'چالاک' : 'Active') : (lang === 'ku' ? 'ناچالاک' : 'Inactive')}</span></td>
                            <td>
                              <div className="action-row">
                                <button className="btn btn-ghost-blue btn-sm" onClick={() => openEditCategory(c)}>✏️</button>
                                <button className="btn btn-ghost-red btn-sm" onClick={() => deleteCategory(c.id)}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/*  Menu Panel  */}
            <div className={`panel${tab === 'menu' ? ' active' : ''}`}>
              <div className="section-header">
                <div>
                  <div className="section-title">{lang === 'ku' ? 'بڕگەکانی مینیو' : 'Menu Items'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{filteredMenu.length} {lang === 'ku' ? 'بڕگە' : 'items'}</div>
                </div>
                <div className="section-right">
                  <select className="form-input" style={{ width: 180, padding: '7px 10px', fontSize: 12 }} value={menuFilter} onChange={e => setMenuFilter(e.target.value)}>
                    <option value="">{lang === 'ku' ? 'هەموو چێشتخانەکان' : 'All Restaurants'}</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={openAddItem}>
                    + {lang === 'ku' ? 'زیادکردنی بڕگە' : 'Add Item'}
                  </button>
                </div>
              </div>

              {filteredMenu.length === 0 ? (
                <div className="empty"><div className="empty-icon">🍽️</div><div className="empty-text">{lang === 'ku' ? 'بڕگەیەک نەدۆزرایەوە' : 'No items found'}</div></div>
              ) : (
                <div className="menu-grid">
                  {filteredMenu.map(m => (
                    <div key={m.id} className="menu-card">
                      <div className="menu-img">
                        {m.image_url ? <img src={m.image_url} alt={m.name} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : '🍽️'}
                        {!m.is_available && <div className="unavail-overlay">{lang === 'ku' ? 'نابەردەست' : 'UNAVAILABLE'}</div>}
                      </div>
                      <div className="menu-body">
                        <div className="menu-name">{m.name}</div>
                        <div className="menu-price">{fmt(m.price)} IQD</div>
                        <div className="menu-meta">
                          {m.restaurants?.name && <span className="menu-tag">🏪 {m.restaurants.name}</span>}
                          {m.menu_categories?.name && <span className="menu-tag">{m.menu_categories.name}</span>}
                          {m.is_vegetarian && <span className="menu-tag" style={{ color: 'var(--green)', borderColor: '#bbf7d0' }}>🌿</span>}
                          <span className="menu-tag">⏱ {m.preparation_time}m</span>
                        </div>
                        {m.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>{m.description}</div>}
                      </div>
                      <div className="menu-actions">
                        <button className="btn btn-ghost-blue btn-sm" style={{ flex: 1 }} onClick={() => openEditItem(m)}>✏️ {lang === 'ku' ? 'دەستکاری' : 'Edit'}</button>
                        <button className={`btn btn-sm ${m.is_available ? 'btn-ghost-amber' : 'btn-ghost-green'}`} onClick={() => toggleItemAvailability(m.id, m.is_available)}>
                          {m.is_available ? (lang === 'ku' ? '⏸ ناچالاک' : '⏸ Hide') : (lang === 'ku' ? '▶ چالاک' : '▶ Show')}
                        </button>
                        <button className="btn btn-ghost-red btn-sm" onClick={() => deleteItem(m.id)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/*  Orders Panel  */}
            <div className={`panel${tab === 'orders' ? ' active' : ''}`}>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' }}>
                {[
                  { icon: '📋', label: lang === 'ku' ? 'کۆی گشتی' : 'Total', val: orders.length },
                  { icon: '🔥', label: lang === 'ku' ? 'ئامادەکردن' : 'Preparing', val: orderStats.preparing },
                  { icon: '🚗', label: lang === 'ku' ? 'لە ڕێگا' : 'In Transit', val: orderStats.inTransit },
                  { icon: '✅', label: lang === 'ku' ? 'گەیشتووە' : 'Delivered', val: orderStats.delivered },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val" style={{ fontSize: 22 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="section-header">
                <div className="section-title">{lang === 'ku' ? 'داواکاریەکان' : 'Orders'}</div>
                <div className="filter-tabs">
                  {['all', 'pending', 'confirmed', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered', 'cancelled'].map(s => (
                    <button key={s} className={`filter-tab${orderFilter === s ? ' active' : ''}`} onClick={() => setOrderFilter(s)}>
                      {s === 'all' ? (lang === 'ku' ? 'هەموو' : 'All') : (statusLabel[s]?.[lang] || s)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="table-wrap">
                  {filteredOrders.length === 0 ? (
                    <div className="empty"><div className="empty-icon">📦</div><div className="empty-text">{lang === 'ku' ? 'داواکارییەک نەدۆزرایەوە' : 'No orders found'}</div></div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>{lang === 'ku' ? 'ژ. داواکاری' : 'Order #'}</th>
                          <th>{lang === 'ku' ? 'کڕیار' : 'Customer'}</th>
                          <th>{lang === 'ku' ? 'چێشتخانە' : 'Restaurant'}</th>
                          <th>{lang === 'ku' ? 'دۆخ' : 'Status'}</th>
                          <th>{lang === 'ku' ? 'کۆی گشتی' : 'Total'}</th>
                          <th>{lang === 'ku' ? 'بەروار' : 'Date'}</th>
                          <th>{lang === 'ku' ? 'کردارەکان' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map(o => (
                          <tr key={o.id}>
                            <td><span className="td-bold">{o.order_number}</span></td>
                            <td>
                              <div className="td-bold">{o.customer?.full_name || '—'}</div>
                              <div className="td-muted">{o.customer?.phone || ''}</div>
                            </td>
                            <td>{o.restaurant?.name || '—'}</td>
                            <td>
                              <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, width: 'auto', minWidth: 110 }}
                                value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}>
                                {['pending','confirmed','preparing','ready_for_pickup','picked_up','in_transit','delivered','cancelled'].map(s => (
                                  <option key={s} value={s}>{statusLabel[s]?.[lang] || s}</option>
                                ))}
                              </select>
                            </td>
                            <td><span className="td-bold" style={{ color: 'var(--accent)' }}>{fmt(o.total_amount)} IQD</span></td>
                            <td className="td-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>
                              <button className="btn btn-ghost-blue btn-sm" onClick={() => { setOrderDetail(o); setModal('order-detail'); }}>
                                👁 {lang === 'ku' ? 'بینین' : 'View'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/*  Users Panel  */}
            <div className={`panel${tab === 'users' ? ' active' : ''}`}>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
                {[
                  { icon: '👥', label: lang === 'ku' ? 'کۆی گشتی' : 'Total Users', val: users.length },
                  { icon: '🛍️', label: lang === 'ku' ? 'کڕیاران' : 'Customers', val: users.filter(u => u.role === 'customer').length },
                  { icon: '🏪', label: lang === 'ku' ? 'فرۆشندەران' : 'Vendors', val: users.filter(u => u.role === 'vendor').length },
                  { icon: '🚗', label: lang === 'ku' ? 'گەیاندەران' : 'Drivers', val: users.filter(u => u.role === 'delivery_person').length },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val" style={{ fontSize: 22 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="section-header">
                <div className="section-title">{lang === 'ku' ? 'بەکارهێنەران' : 'Users'}</div>
                <div className="filter-tabs">
                  {['all', 'customer', 'vendor', 'delivery_person', 'admin'].map(r => (
                    <button key={r} className={`filter-tab${userFilter === r ? ' active' : ''}`} onClick={() => setUserFilter(r)}>
                      {r === 'all' ? (lang === 'ku' ? 'هەموو' : 'All') :
                        r === 'customer' ? (lang === 'ku' ? 'کڕیار' : 'Customer') :
                        r === 'vendor' ? (lang === 'ku' ? 'فرۆشندە' : 'Vendor') :
                        r === 'delivery_person' ? (lang === 'ku' ? 'گەیاندەر' : 'Driver') : 'Admin'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="table-wrap">
                  {filteredUsers.length === 0 ? (
                    <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">{lang === 'ku' ? 'بەکارهێنەرێک نەدۆزرایەوە' : 'No users found'}</div></div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>{lang === 'ku' ? 'بەکارهێنەر' : 'User'}</th>
                          <th>{lang === 'ku' ? 'ئیمەیڵ' : 'Email'}</th>
                          <th>{lang === 'ku' ? 'ئەرک' : 'Role'}</th>
                          <th>{lang === 'ku' ? 'دۆخ' : 'Status'}</th>
                          <th>{lang === 'ku' ? 'بەرواری تۆمار' : 'Joined'}</th>
                          <th>{lang === 'ku' ? 'کردارەکان' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="user-avatar">{(u.full_name || u.email || '?')[0].toUpperCase()}</div>
                                <div>
                                  <div className="td-bold">{u.full_name || '—'}</div>
                                  <div className="td-muted" style={{ fontSize: 10 }}>{u.id?.slice(0, 12)}…</div>
                                </div>
                              </div>
                            </td>
                            <td className="td-muted">{u.email || '—'}</td>
                            <td>
                              <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, width: 'auto', minWidth: 100 }}
                                value={u.role} onChange={e => updateUserRole(u.id, e.target.value)}>
                                <option value="customer">{lang === 'ku' ? 'کڕیار' : 'Customer'}</option>
                                <option value="vendor">{lang === 'ku' ? 'فرۆشندە' : 'Vendor'}</option>
                                <option value="delivery_person">{lang === 'ku' ? 'گەیاندەر' : 'Driver'}</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>
                              <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                                {u.is_active ? (lang === 'ku' ? 'چالاک' : 'Active') : (lang === 'ku' ? 'ناچالاک' : 'Inactive')}
                              </span>
                            </td>
                            <td className="td-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                            <td>
                              <button className={`btn btn-sm ${u.is_active ? 'btn-ghost-amber' : 'btn-ghost-green'}`}
                                onClick={() => toggleUserActive(u.id, u.is_active)}>
                                {u.is_active ? (lang === 'ku' ? '⏸ ناچالاک' : '⏸ Disable') : (lang === 'ku' ? '▶ چالاک' : '▶ Enable')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/*  My Restaurant Panel  */}
            <div className={`panel${tab === 'my-restaurant' ? ' active' : ''}`}>
              <div className="section-header">
                <div>
                  <div className="section-title">{lang === 'ku' ? 'زانیارییەکانی چێشتخانە' : 'Restaurant Information'}</div>
                  <div className="breadcrumb" style={{ marginTop: 4 }}>{lang === 'ku' ? 'بەڕێوەبردنی زانیارییە سەرەکییەکانی چێشتخانەکەت' : 'Manage your primary restaurant settings'}</div>
                </div>
              </div>
              
              <div className="card" style={{ padding: '28px', maxWidth: '850px', margin: '0 0 24px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{lang === 'ku' ? 'ناوی چێشتخانە *' : 'Restaurant Name *'}</label>
                    <input className="form-input" value={resForm.name} onChange={e => setResForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Tasty Pizza" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{lang === 'ku' ? 'تەلەفۆن *' : 'Phone *'}</label>
                    <input className="form-input" value={resForm.phone} onChange={e => setResForm(p => ({ ...p, phone: e.target.value }))} placeholder="+964 7XX XXX XXXX" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{lang === 'ku' ? 'وەسف' : 'Description'}</label>
                  <textarea className="form-input" value={resForm.description} onChange={e => setResForm(p => ({ ...p, description: e.target.value }))} placeholder="..." />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{lang === 'ku' ? 'شار *' : 'City *'}</label>
                    <input className="form-input" value={resForm.city} onChange={e => setResForm(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{lang === 'ku' ? 'ناونیشان *' : 'Address *'}</label>
                    <input className="form-input" value={resForm.address} onChange={e => setResForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{lang === 'ku' ? 'جۆری خواردن' : 'Cuisine Type'}</label>
                    <input className="form-input" value={resForm.cuisine_type} onChange={e => setResForm(p => ({ ...p, cuisine_type: e.target.value }))} placeholder="Pizza, Burger..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{lang === 'ku' ? 'وێنەی چێشتخانە' : 'Restaurant Image'}</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', background: '#fff' }}>
                        📁 {lang === 'ku' ? 'هەڵبژاردنی وێنە' : 'Pick Image'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) setResForm(p => ({ ...p, imageFile: f }));
                        }} />
                      </label>
                      {(resForm.imageFile || resForm.image_url) && (
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', border: '2px solid #fff', boxShadow: 'var(--shadow-sm)' }}>
                          <img src={resForm.imageFile ? URL.createObjectURL(resForm.imageFile) : resForm.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                    <label className="form-label">💰 {lang === 'ku' ? 'کرێی گەیاندن (IQD)' : 'Delivery Fee (IQD)'}</label>
                    <input className="form-input" type="number" value={resForm.delivery_fee} onChange={e => setResForm(p => ({ ...p, delivery_fee: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                    <label className="form-label">🛒 {lang === 'ku' ? 'کەمترین داواکاری (IQD)' : 'Minimum Order (IQD)'}</label>
                    <input className="form-input" type="number" value={resForm.minimum_order} onChange={e => setResForm(p => ({ ...p, minimum_order: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">🕒 {lang === 'ku' ? 'کاتی کردنەوە' : 'Opening Time'}</label>
                    <input className="form-input" type="time" value={resForm.opening_time} onChange={e => setResForm(p => ({ ...p, opening_time: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🌑 {lang === 'ku' ? 'کاتی داخستن' : 'Closing Time'}</label>
                    <input className="form-input" type="time" value={resForm.closing_time} onChange={e => setResForm(p => ({ ...p, closing_time: e.target.value }))} />
                  </div>
                </div>

                <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn btn-primary" onClick={saveRestaurant} disabled={loading} style={{ padding: '10px 40px', fontSize: 14 }}>
                    {loading ? (lang === 'ku' ? 'پاشەکەوتکردن…' : 'Saving…') : (lang === 'ku' ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'Save Details')}
                  </button>
                </div>
              </div>
            </div>

          </div>{/* /content */}
        </div>{/* /main */}
      </div>{/* /layout */}

      {/*  Restaurant Modal  */}
      <div className={`overlay${modal === 'restaurant' ? ' open' : ''}`} onClick={() => setModal(null)} dir={dir}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <button className="close-x" onClick={() => setModal(null)}>✕</button>
          <div className="modal-title">{editId ? (lang === 'ku' ? 'دەستکاریکردنی چێشتخانە' : 'Edit Restaurant') : (lang === 'ku' ? 'زیادکردنی چێشتخانە' : 'Add Restaurant')}</div>

          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'بەکارهێنەری فرۆشندە *' : 'Vendor User *'}</label>
            <select className="form-input" value={resForm.vendor_id} onChange={e => setResForm(p => ({ ...p, vendor_id: e.target.value }))}>
              <option value="">{lang === 'ku' ? 'فرۆشندەیەک هەڵبژێرە…' : 'Select a vendor…'}</option>
              {users.filter(u => u.role === 'vendor').map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email} (ID: {u.id.slice(0,8)}...)</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'ناوی چێشتخانە *' : 'Restaurant Name *'}</label>
            <input className="form-input" value={resForm.name} onChange={e => setResForm(p => ({ ...p, name: e.target.value }))} placeholder={lang === 'ku' ? 'بۆ نموونە: چێشتخانەی بەغدا' : 'e.g. Baghdad Grill House'} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'وەسف' : 'Description'}</label>
            <textarea className="form-input" value={resForm.description} onChange={e => setResForm(p => ({ ...p, description: e.target.value }))} placeholder={lang === 'ku' ? 'وەسفێکی کورت...' : 'Short description...'} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'تەلەفۆن *' : 'Phone *'}</label>
              <input className="form-input" value={resForm.phone} onChange={e => setResForm(p => ({ ...p, phone: e.target.value }))} placeholder="+964 7xx xxx xxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'شار *' : 'City *'}</label>
              <input className="form-input" value={resForm.city} onChange={e => setResForm(p => ({ ...p, city: e.target.value }))} placeholder={lang === 'ku' ? 'هەولێر، بەغدا...' : 'Baghdad, Erbil...'} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'ناونیشان *' : 'Address *'}</label>
            <input className="form-input" value={resForm.address} onChange={e => setResForm(p => ({ ...p, address: e.target.value }))} placeholder={lang === 'ku' ? 'ناونیشانی کوچە' : 'Street address'} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'پانی (Latitude)' : 'Latitude'}</label>
              <input className="form-input" type="number" step="any" value={resForm.latitude} onChange={e => setResForm(p => ({ ...p, latitude: e.target.value }))} placeholder="33.3128" />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'درێژی (Longitude)' : 'Longitude'}</label>
              <input className="form-input" type="number" step="any" value={resForm.longitude} onChange={e => setResForm(p => ({ ...p, longitude: e.target.value }))} placeholder="44.3615" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'جۆری خواردن' : 'Cuisine Type'}</label>
              <input className="form-input" value={resForm.cuisine_type} onChange={e => setResForm(p => ({ ...p, cuisine_type: e.target.value }))} placeholder={lang === 'ku' ? 'عێراقی، پیتزا...' : 'Iraqi, Pizza, Fast Food...'} />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'دۆخ' : 'Status'}</label>
              <select className="form-input" value={resForm.status} onChange={e => setResForm(p => ({ ...p, status: e.target.value as Restaurant['status'] }))}>
                <option value="active">{lang === 'ku' ? 'چالاک' : 'Active'}</option>
                <option value="inactive">{lang === 'ku' ? 'ناچالاک' : 'Inactive'}</option>
                <option value="pending_approval">{lang === 'ku' ? 'چاوەڕوانی پەسەند' : 'Pending Approval'}</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'کرێی گەیاندن (IQD)' : 'Delivery Fee (IQD)'}</label>
              <input className="form-input" type="number" value={resForm.delivery_fee} onChange={e => setResForm(p => ({ ...p, delivery_fee: e.target.value }))} placeholder="2000" />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'کەمترین داواکاری (IQD)' : 'Minimum Order (IQD)'}</label>
              <input className="form-input" type="number" value={resForm.minimum_order} onChange={e => setResForm(p => ({ ...p, minimum_order: e.target.value }))} placeholder="5000" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'کاتی کردنەوە' : 'Opening Time'}</label>
              <input className="form-input" type="time" value={resForm.opening_time} onChange={e => setResForm(p => ({ ...p, opening_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'کاتی داخستن' : 'Closing Time'}</label>
              <input className="form-input" type="time" value={resForm.closing_time} onChange={e => setResForm(p => ({ ...p, closing_time: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'کاتی خەمڵاندراو (خولەک)' : 'Est. Delivery Time (min)'}</label>
              <input className="form-input" type="number" value={resForm.estimated_delivery_time} onChange={e => setResForm(p => ({ ...p, estimated_delivery_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'وێنەی چێشتخانە' : 'Restaurant Image'}</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label className="btn btn-ghost-blue btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  📁 {lang === 'ku' ? 'هەڵبژاردنی وێنە' : 'Pick Image'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setResForm(p => ({ ...p, imageFile: f }));
                  }} />
                </label>
                {(resForm.imageFile || resForm.image_url) && (
                  <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={resForm.imageFile ? URL.createObjectURL(resForm.imageFile) : resForm.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{lang === 'ku' ? 'پاشگەزبوونەوە' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={saveRestaurant} disabled={loading}>
              {loading ? (lang === 'ku' ? 'پاشەکەوتکردن…' : 'Saving…') : (lang === 'ku' ? 'پاشەکەوتکردن' : 'Save Restaurant')}
            </button>
          </div>
        </div>
      </div>

      {/*  Menu Item Modal  */}
      <div className={`overlay${modal === 'item' ? ' open' : ''}`} onClick={() => setModal(null)} dir={dir}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <button className="close-x" onClick={() => setModal(null)}>✕</button>
          <div className="modal-title">{editId ? (lang === 'ku' ? 'دەستکاریکردنی بڕگە' : 'Edit Menu Item') : (lang === 'ku' ? 'زیادکردنی بڕگە' : 'Add Menu Item')}</div>

          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'ناوی بڕگە *' : 'Item Name *'}</label>
            <input className="form-input" value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder={lang === 'ku' ? 'بۆ نموونە: کەبابی بریان' : 'e.g. Grilled Kebab Platter'} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'وەسف' : 'Description'}</label>
            <textarea className="form-input" value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} placeholder={lang === 'ku' ? 'وەسفێکی کورت...' : 'Short description...'} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'نرخ (IQD) *' : 'Price (IQD) *'}</label>
              <input className="form-input" type="number" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} placeholder="12500" />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'کاتی ئامادەکردن (خولەک)' : 'Preparation Time (min)'}</label>
              <input className="form-input" type="number" value={itemForm.preparation_time} onChange={e => setItemForm(p => ({ ...p, preparation_time: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            {userProfile?.role === 'admin' ? (
              <div className="form-group">
                <label className="form-label">{lang === 'ku' ? 'چێشتخانە *' : 'Restaurant *'}</label>
                <select className="form-input" value={itemForm.restaurant_id} onChange={e => setItemForm(p => ({ ...p, restaurant_id: e.target.value, category_id: '' }))}>
                  <option value="">{lang === 'ku' ? 'چێشتخانەیەک هەڵبژێرە' : 'Select restaurant…'}</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            ) : null}
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'پۆل' : 'Category'}</label>
              <select className="form-input" value={itemForm.category_id} onChange={e => setItemForm(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">{lang === 'ku' ? 'پۆلێک نیە' : 'No Category'}</option>
                {categories.filter(c => c.restaurant_id === itemForm.restaurant_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'وێنەی خواردن' : 'Item Image'}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label className="btn btn-ghost-blue btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                📁 {lang === 'ku' ? 'هەڵبژاردنی وێنە' : 'Pick Image'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setItemForm(p => ({ ...p, imageFile: f }));
                }} />
              </label>
              {(itemForm.imageFile || itemForm.image_url) && (
                <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={itemForm.imageFile ? URL.createObjectURL(itemForm.imageFile) : itemForm.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
            <label className="form-check">
              <input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm(p => ({ ...p, is_available: e.target.checked }))} />
              {lang === 'ku' ? 'بەردەستە' : 'Available'}
            </label>
            <label className="form-check">
              <input type="checkbox" checked={itemForm.is_vegetarian} onChange={e => setItemForm(p => ({ ...p, is_vegetarian: e.target.checked }))} />
              {lang === 'ku' ? 'رووەکی 🌿' : 'Vegetarian 🌿'}
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{lang === 'ku' ? 'پاشگەزبوونەوە' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={saveItem} disabled={loading}>
              {loading ? (lang === 'ku' ? 'پاشەکەوتکردن…' : 'Saving…') : (lang === 'ku' ? 'پاشەکەوتکردن' : 'Save Item')}
            </button>
          </div>
        </div>
      </div>

      {/*  Order Detail Modal  */}
      <div className={`overlay${modal === 'order-detail' ? ' open' : ''}`} onClick={() => setModal(null)} dir={dir}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <button className="close-x" onClick={() => setModal(null)}>✕</button>
          {orderDetail && <>
            <div className="modal-title">
              {lang === 'ku' ? 'داواکاری' : 'Order'} {orderDetail.order_number}
              <span className={`badge ${statusColors[orderDetail.status] || 'badge-gray'}`} style={{ marginLeft: 10, verticalAlign: 'middle', fontSize: 12 }}>
                {statusLabel[orderDetail.status]?.[lang] || orderDetail.status}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="detail-section">
                <div className="detail-sec-title">{lang === 'ku' ? 'کڕیار' : 'Customer'}</div>
                <div className="detail-row"><span>{lang === 'ku' ? 'ناو' : 'Name'}</span><span style={{ fontWeight: 600 }}>{orderDetail.customer?.full_name || '—'}</span></div>
                <div className="detail-row"><span>{lang === 'ku' ? 'ئیمەیڵ' : 'Email'}</span><span style={{ fontSize: 12 }}>{orderDetail.customer?.email || '—'}</span></div>
                <div className="detail-row"><span>{lang === 'ku' ? 'تەلەفۆن' : 'Phone'}</span><span>{orderDetail.customer?.phone || '—'}</span></div>
              </div>
              <div className="detail-section">
                <div className="detail-sec-title">{lang === 'ku' ? 'چێشتخانە و شۆفێر' : 'Restaurant & Driver'}</div>
                <div className="detail-row"><span>{lang === 'ku' ? 'چێشتخانە' : 'Restaurant'}</span><span style={{ fontWeight: 600 }}>{orderDetail.restaurant?.name || '—'}</span></div>
                <div className="detail-row"><span>{lang === 'ku' ? 'شۆفێر' : 'Driver'}</span><span>{orderDetail.delivery_person?.full_name || (lang === 'ku' ? 'دانەنراوە' : 'Unassigned')}</span></div>
                <div className="detail-row"><span>{lang === 'ku' ? 'بەروار' : 'Date'}</span><span style={{ fontSize: 12 }}>{new Date(orderDetail.created_at).toLocaleString()}</span></div>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-sec-title">{lang === 'ku' ? 'ناونیشانی گەیاندن' : 'Delivery Address'}</div>
              <div className="detail-row">
                <span style={{ fontWeight: 600 }}>{orderDetail.addresses?.label || (lang === 'ku' ? 'ناونیشان' : 'Address')}</span>
                <span>{orderDetail.addresses ? `${orderDetail.addresses.street_address}, ${orderDetail.addresses.city}` : (lang === 'ku' ? 'نادیار' : 'N/A')}</span>
              </div>
            </div>
            <div className="detail-section" style={{ marginTop: 12 }}>
              <div className="detail-sec-title">{lang === 'ku' ? 'بڕگەکانی داواکاری' : 'Order Items'}</div>
              {orderDetail.order_items?.length > 0 ? orderDetail.order_items.map((item, i) => (
                <div key={i} className="detail-row">
                  <span>{item.menu_items?.name || 'Unknown'} <span style={{ color: 'var(--muted)', fontSize: 12 }}>×{item.quantity}</span></span>
                  <span style={{ fontWeight: 600 }}>{fmt(item.total_price)} IQD</span>
                </div>
              )) : <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>{lang === 'ku' ? 'بڕگەیەک نییە' : 'No items data'}</div>}
            </div>
            <div className="detail-section" style={{ background: 'var(--surface2)', padding: 12, borderRadius: 10, marginTop: 12 }}>
              <div className="detail-row"><span>{lang === 'ku' ? 'کۆی بەشەکی' : 'Subtotal'}</span><span>{fmt(orderDetail.subtotal)} IQD</span></div>
              <div className="detail-row"><span>{lang === 'ku' ? 'کرێی گەیاندن' : 'Delivery Fee'}</span><span>{fmt(orderDetail.delivery_fee)} IQD</span></div>
              <div className="detail-row"><span>{lang === 'ku' ? 'باج' : 'Tax'}</span><span>{fmt(orderDetail.tax)} IQD</span></div>
              <div className="detail-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>
                <span>{lang === 'ku' ? 'کۆی گشتی' : 'Total'}</span>
                <span>{fmt(orderDetail.total_amount)} IQD</span>
              </div>
            </div>
            {orderDetail.special_instructions && (
              <div style={{ marginTop: 12, padding: 12, background: '#fffbeb', borderRadius: 10, fontSize: 13, color: '#b45309', border: '1px solid #fde68a' }}>
                📝 {orderDetail.special_instructions}
              </div>
            )}
          </>}
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{lang === 'ku' ? 'داخستن' : 'Close'}</button>
          </div>
        </div>
      </div>

      {/*  IoT Detail Modal  */}
      <div className={`overlay${modal === 'iot-detail' ? ' open' : ''}`} onClick={() => setModal(null)} dir={dir}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <button className="close-x" onClick={() => setModal(null)}>✕</button>
          {selectedIot && <>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>📡 {lang === 'ku' ? 'چاودێری IoT' : 'IoT Device Monitor'}</span>
              <span className={`badge ${selectedIot.is_pack_online ? 'badge-green' : 'badge-red'}`}>
                {selectedIot.is_pack_online ? (lang === 'ku' ? 'ئۆنلاین' : 'ONLINE') : (lang === 'ku' ? 'ئۆفلاین' : 'OFFLINE')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 64, fontWeight: 800, color: tempColor(selectedIot.current_temp), lineHeight: 1 }}>{selectedIot.current_temp ?? '—'}</span>
                  <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--muted)' }}>°C</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{lang === 'ku' ? 'پلەی گەرمی ژوری پاکەت' : 'Package interior temperature'}</div>
                {selectedIot.battery_percentage !== undefined && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>🔋 {lang === 'ku' ? 'بەتەری' : 'Battery'}</span>
                      <span style={{ fontWeight: 700 }}>{selectedIot.battery_percentage}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 8, borderRadius: 4 }}>
                      <div className="progress-fill" style={{ width: `${selectedIot.battery_percentage}%`, background: selectedIot.battery_percentage > 50 ? 'var(--green)' : selectedIot.battery_percentage > 20 ? 'var(--amber)' : 'var(--red)' }} />
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>{lang === 'ku' ? 'داواکاری:' : 'Order:'}</span> <strong>#{selectedIot.order_number || '—'}</strong></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>{lang === 'ku' ? 'چێشتخانە:' : 'Restaurant:'}</span> <strong>{selectedIot.restaurant_name || '—'}</strong></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>{lang === 'ku' ? 'شۆفێر:' : 'Driver:'}</span> <strong>{selectedIot.driver_name || '—'}</strong></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>{lang === 'ku' ? 'دوایین نوێکردنەوە:' : 'Last update:'}</span> <strong>{selectedIot.last_update ? timeAgo(selectedIot.last_update, lang) : '—'}</strong></div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  📷 {lang === 'ku' ? 'کامێرای زیندوو' : 'Live Camera'}
                </div>
                {selectedIot.camera_stream_url ? (
                  <iframe
                    src={selectedIot.camera_stream_url}
                    className="camera-stream"
                    allow="camera; autoplay"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <div className="no-stream">
                    <div className="no-stream-icon">📷</div>
                    <div className="no-stream-text">{lang === 'ku' ? 'ستریمی کامێرا بەردەست نییە' : 'Camera stream unavailable'}</div>
                  </div>
                )}
              </div>
            </div>
          </>}
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{lang === 'ku' ? 'داخستن' : 'Close'}</button>
          </div>
        </div>
      </div>

      {/*  Category Modal  */}
      <div className={`overlay${modal === 'category' ? ' open' : ''}`} onClick={() => setModal(null)} dir={dir}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <button className="close-x" onClick={() => setModal(null)}>✕</button>
          <div className="modal-title">{editId ? (lang === 'ku' ? 'دەستکاریکردنی پۆل' : 'Edit Category') : (lang === 'ku' ? 'زیادکردنی پۆل' : 'Add Category')}</div>

          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'ناوی پۆل *' : 'Category Name *'}</label>
            <input className="form-input" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder={lang === 'ku' ? 'بۆ نموونە: پیتزا، خواردنەوەکان...' : 'e.g. Pizza, Drinks...'} />
          </div>

          {userProfile?.role === 'admin' ? (
            <div className="form-group">
              <label className="form-label">{lang === 'ku' ? 'چێشتخانە *' : 'Restaurant *'}</label>
              <select className="form-input" value={catForm.restaurant_id} onChange={e => setCatForm(p => ({ ...p, restaurant_id: e.target.value }))}>
                <option value="">{lang === 'ku' ? 'چێشتخانەیەک هەڵبژێرە…' : 'Select a restaurant…'}</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label">{lang === 'ku' ? 'ڕیزبەندی نیشاندان' : 'Display Order'}</label>
            <input className="form-input" type="number" value={catForm.display_order} onChange={e => setCatForm(p => ({ ...p, display_order: e.target.value }))} />
          </div>

          <label className="form-check">
            <input type="checkbox" checked={catForm.is_active} onChange={e => setCatForm(p => ({ ...p, is_active: e.target.checked }))} />
            {lang === 'ku' ? 'چالاکە' : 'Is Active'}
          </label>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{lang === 'ku' ? 'پاشگەزبوونەوە' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={saveCategory} disabled={loading}>
              {loading ? (lang === 'ku' ? 'پاشەکەوتکردن…' : 'Saving…') : (lang === 'ku' ? 'پاشەکەوتکردن' : 'Save Category')}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast${toast ? ' show' : ''} ${toastType === 'error' ? 'toast-error' : 'toast-success'}`} dir={dir}>
        {toastType === 'success' ? '✓ ' : '✕ '}{toast}
      </div>
    </>
  );
}