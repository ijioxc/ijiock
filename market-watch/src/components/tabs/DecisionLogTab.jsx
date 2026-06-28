import React from 'react';
import { useDecisionStore } from '../../store/useDecisionStore';

export default function DecisionLogTab() {
  const decisionLogs = useDecisionStore((s) => s.decisionLogs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: 'var(--space-4)' }}>
      {decisionLogs.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', marginTop: 'var(--space-5)', fontSize: '14px' }}>
          尚無決策紀錄。
        </div>
      ) : (
        decisionLogs.map((log) => (
          <div key={log.id} style={{ 
            background: 'var(--surface-2)', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: 'var(--space-4)',
            border: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)' }}>
                {log.ticker} <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>[{log.action}]</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
            
            {log.reason && (
              <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '12px', fontStyle: 'italic' }}>
                "{log.reason}"
              </div>
            )}
            
            {/* Snapshot */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
                位階: {log.snapshot?.position?.desc || '無'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
                結構: {log.snapshot?.trend?.desc || '無'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
                量能: {log.snapshot?.volume?.desc || '無'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
                R/R: {log.snapshot?.rr?.desc || '無'}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
