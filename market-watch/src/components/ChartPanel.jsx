import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { useResearchStore } from '../store/researchStore';
import { useSettingsStore } from '../store/uiStore';

export default function ChartPanel({ symbol }) {
  const chartData = useResearchStore((s) => s.chartData);
  const isChartLoading = useResearchStore((s) => s.isChartLoading);
  const overlays = useSettingsStore((s) => s.overlays || {});
  const chartContainerRef = useRef(null);
  const legendRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const maSeriesRef = useRef(null);
  const sarSeriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. 初始化 TradingView 實例，套用 CSS 變數進行深色適應
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#86868b', // 對應 var(--text-muted)
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // 2. 建立 K 線圖層 (相容 lightweight-charts v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef5350', // 替換為你的 var(--up) 色碼
      downColor: '#26a69a', // 替換為你的 var(--dn) 色碼
      borderVisible: false,
      wickUpColor: '#ef5350',
      wickDownColor: '#26a69a',
    });
    seriesRef.current = candlestickSeries;

    const maSeries = chart.addSeries(LineSeries, {
      color: 'rgba(255, 204, 0, 0.6)',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    maSeriesRef.current = maSeries;

    const sarSeries = chart.addSeries(LineSeries, {
      color: '#E91E63',
      lineWidth: 0,
      pointMarkersVisible: true,
      pointMarkersRadius: 3,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    sarSeriesRef.current = sarSeries;

    // 3. 注入從 Store 取出的資料
    // 我們使用 useEffect 的 cleanup 機制確保舊資料被清空，但我們需要傳入 data
    // 因此我們將在外層加上 useSelector 取得資料
    const ro = new ResizeObserver((entries) => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      const newRect = entries[0].contentRect;
      chart.applyOptions({ width: newRect.width, height: newRect.height });
    });

    ro.observe(chartContainerRef.current);

    ro.observe(chartContainerRef.current);

    // 4. 十字線互動 (Crosshair Legend)
    chart.subscribeCrosshairMove((param) => {
      if (!legendRef.current) return;
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        legendRef.current.style.display = 'none';
      } else {
        const data = param.seriesData.get(candlestickSeries);
        if (data) {
          legendRef.current.style.display = 'block';
          const isUp = data.close > data.open;
          const color = isUp ? 'var(--up)' : 'var(--dn)';
          legendRef.current.innerHTML = `
            <div style="display: flex; gap: 12px; font-family: var(--font-mono); font-size: 13px;">
              <span style="color: var(--text-2)">O <span style="color: ${color}">${data.open.toFixed(2)}</span></span>
              <span style="color: var(--text-2)">H <span style="color: ${color}">${data.high.toFixed(2)}</span></span>
              <span style="color: var(--text-2)">L <span style="color: ${color}">${data.low.toFixed(2)}</span></span>
              <span style="color: var(--text-2)">C <span style="color: ${color}">${data.close.toFixed(2)}</span></span>
            </div>
          `;
        }
      }
    });

    // 5. Cleanup Function: 防止元件卸載時造成 Memory Leak
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [symbol]); // 當 symbol 改變時重繪

  // 當 Store 中的 chartData 更新時，設定給 K 線系列
  useEffect(() => {
    if (chartRef.current && seriesRef.current && chartData.length > 0) {
      seriesRef.current.setData(chartData);
      
      const closes = chartData.map(d => d.close);
      
      if (overlays.ma !== false && maSeriesRef.current) {
        const maData = [];
        for (let i = 0; i < chartData.length; i++) {
          if (i < 19) continue;
          const slice = closes.slice(i - 19, i + 1);
          const sum = slice.reduce((a, b) => a + b, 0);
          maData.push({ time: chartData[i].time, value: sum / 20 });
        }
        maSeriesRef.current.setData(maData);
      } else if (maSeriesRef.current) {
        maSeriesRef.current.setData([]);
      }

      // SAR mock (如果未來有真正的 SAR 函數，就套用)
      if (overlays.sar && sarSeriesRef.current) {
        const sarData = chartData.map(d => ({ time: d.time, value: d.low - (d.close * 0.01) }));
        sarSeriesRef.current.setData(sarData);
      } else if (sarSeriesRef.current) {
        sarSeriesRef.current.setData([]);
      }

      chartRef.current.timeScale().fitContent();
    }
  }, [chartData, overlays.ma, overlays.sar]);

  // 確保最外層 div 撐滿父容器
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 浮動圖例 (Legend) */}
      <div 
        ref={legendRef} 
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 5,
          display: 'none',
          padding: '6px 10px',
          backgroundColor: 'rgba(20, 20, 20, 0.7)',
          backdropFilter: 'blur(4px)',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      />
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      {isChartLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'var(--blur-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          color: 'var(--text)',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <span className="mono">載入歷史報價中...</span>
        </div>
      )}
    </div>
  );
}
