import React from 'react';
import { Target } from 'lucide-react';

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * Barra de progresso da meta diária (dashboard e plataforma).
 * Não renderiza se meta não estiver definida ou for zero.
 */
const DailyGoalProgress = ({ dailyProfit = 0, dailyGoal, className = '' }) => {
    const goal = typeof dailyGoal === 'number' ? dailyGoal : parseFloat(dailyGoal);
    if (!goal || goal <= 0 || Number.isNaN(goal)) return null;

    const current = typeof dailyProfit === 'number' ? dailyProfit : 0;
    const percent = Math.min(100, Math.max(0, (current / goal) * 100));
    const reached = current >= goal;
    const isNegative = current < 0;

    const fillStyle = isNegative
        ? {
            width: `${percent}%`,
            background: 'var(--money-negative)',
        }
        : {
            width: `${percent}%`,
            background: 'var(--money-positive)',
        };

    return (
        <div className={`glass-card daily-goal-progress animate-fade-in ${className}`.trim()}>
            <div className="daily-goal-progress__header">
                <div className="daily-goal-progress__title">
                    <div className="daily-goal-progress__icon">
                        <Target size={18} />
                    </div>
                    <div>
                        <h3>Meta do dia</h3>
                        <p>{reached ? 'Meta atingida!' : 'Progresso do lucro diário'}</p>
                    </div>
                </div>
                <div className="daily-goal-progress__values">
                    <span
                        className="daily-goal-progress__current"
                        style={{
                            color: isNegative
                                ? 'var(--money-negative)'
                                : current > 0
                                    ? 'var(--money-positive)'
                                    : 'var(--text-main)',
                        }}
                    >
                        {formatCurrency(current)}
                    </span>
                    <span className="daily-goal-progress__sep">/</span>
                    <span className="daily-goal-progress__goal">{formatCurrency(goal)}</span>
                </div>
            </div>

            <div className="daily-goal-progress__track">
                <div
                    className="daily-goal-progress__fill"
                    style={fillStyle}
                />
            </div>

            <div className="daily-goal-progress__footer">
                <span className="daily-goal-progress__percent">{percent.toFixed(0)}%</span>
                {!reached && current >= 0 && (
                    <span className="daily-goal-progress__remaining">
                        Faltam {formatCurrency(Math.max(0, goal - current))}
                    </span>
                )}
            </div>
        </div>
    );
};

export default DailyGoalProgress;
