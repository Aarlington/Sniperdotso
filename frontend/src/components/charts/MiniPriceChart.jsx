import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const MiniPriceChart = ({ token, height = 80 }) => {
  const chartData = useMemo(() => {
    if (!token?.priceHistory || token.priceHistory.length === 0) {
      // Generate mock data if no real data
      return Array.from({ length: 20 }, (_, i) => ({
        time: Date.now() - (20 - i) * 30000,
        price: 0.000001 + Math.random() * 0.000001,
      }));
    }
    return token.priceHistory;
  }, [token?.priceHistory]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const isPositive = priceChange >= 0;
  const chartColor = isPositive ? '#22c55e' : '#ef4444';

  return (
    <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1f1f23] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">Price Chart</span>
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
        {token && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gray-400 hover:text-white"
            onClick={() => window.open(`https://dexscreener.com/solana/${token.fullAddress}`, '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Full Chart
          </Button>
        )}
      </div>

      {/* Chart */}
      <div className="p-2" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <XAxis dataKey="time" hide />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1e',
                border: '1px solid #2a2a2e',
                borderRadius: '8px',
                padding: '8px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              formatter={(value) => [`${value.toFixed(10)} SOL`, 'Price']}
              labelFormatter={(label) => new Date(label).toLocaleTimeString()}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: chartColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Price Info */}
      <div className="px-4 py-2 border-t border-[#1f1f23] flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-500">Current: </span>
          <span className="text-white font-medium">
            {chartData.length > 0 ? chartData[chartData.length - 1].price.toFixed(10) : '0'} SOL
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span className={isPositive ? "text-green-400" : "text-red-400"}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default MiniPriceChart;
