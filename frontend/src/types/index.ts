export interface User {
  id: number
  email: string
  full_name: string
  shop_id: number
  shop_name: string
  city?: string
}

export interface Product {
  id: number
  shop_id: number
  name: string
  sku: string | null
  unit_price: number
  cost_price: number | null
  stock_qty: number
  reorder_threshold: number
  category: string | null
  created_at: string
}

export interface Sale {
  id: number
  shop_id: number
  product_id: number
  qty_sold: number
  sale_price: number
  sold_at: string
  product?: Product
}

export interface Alert {
  id: number
  shop_id: number
  product_id: number
  alert_type: 'low_stock' | 'out_of_stock'
  resolved: boolean
  created_at: string
  product?: Product
}

export interface DailyStat { day: string; revenue: number; units: number }
export interface TopSeller { product_id: number; name: string; total_units: number; total_revenue: number }
export interface StockoutForecast {
  product_id: number; name: string; stock_qty: number
  avg_daily_sales: number; days_until_stockout: number | null
}
export interface Summary {
  total_products: number; revenue_today: number; revenue_month: number; low_stock_count: number
}
