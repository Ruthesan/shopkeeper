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
  payment_method: string        // Feature 1
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

// Feature 2: profit fields added to chart data
export interface DailyStat {
  day: string
  revenue: number
  units: number
  profit: number
}

export interface TopSeller {
  product_id: number
  name: string
  total_units: number
  total_revenue: number
  total_profit: number          // Feature 2
}

export interface StockoutForecast {
  product_id: number
  name: string
  stock_qty: number
  avg_daily_sales: number
  days_until_stockout: number | null
}

// Feature 2: profit fields added to summary
export interface Summary {
  total_products: number
  revenue_today: number
  revenue_month: number
  profit_today: number          // Feature 2
  profit_month: number          // Feature 2
  low_stock_count: number
}

// Feature 4: shape of a queued offline sale
export interface OfflineSale {
  product_id: number
  qty_sold: number
  sale_price: number
  payment_method: string
  queued_at: string             // ISO timestamp set locally
}
