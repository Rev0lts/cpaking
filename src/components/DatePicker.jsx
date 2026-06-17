import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const DatePicker = ({ value, onChange, placeholder = "DD/MM/AAAA", style }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const dropdownRef = useRef(null);

    // Parse DD/MM/YYYY into a Date object or null
    const parseDate = (dateStr) => {
        if (!dateStr || dateStr.length !== 10) return null;
        const [day, month, year] = dateStr.split('/');
        const d = new Date(year, month - 1, day);
        if (d.getFullYear() == year && d.getMonth() == month - 1 && d.getDate() == day) {
            return d;
        }
        return null;
    };

    // Initialize current month view to the selected date if valid, otherwise today
    useEffect(() => {
        if (isOpen) {
            const d = parseDate(value);
            if (d) {
                setCurrentMonth(d);
            } else {
                setCurrentMonth(new Date());
            }
        }
    }, [isOpen, value]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Helper: format Date object to DD/MM/YYYY
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Helper: mask input to DD/MM/YYYY
    const handleInputChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 8) val = val.slice(0, 8);

        let masked = '';
        if (val.length > 0) masked += val.substring(0, 2);
        if (val.length > 2) masked += '/' + val.substring(2, 4);
        if (val.length > 4) masked += '/' + val.substring(4, 8);

        onChange(masked);
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const selectDate = (day) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        onChange(formatDate(newDate));
        setIsOpen(false);
    };

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const daysInMonth = getDaysInMonth(year, month);
        const firstDayIndex = getFirstDayOfMonth(year, month);

        const selectedDateObj = parseDate(value);
        const today = new Date();

        const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

        const blanks = [];
        for (let i = 0; i < firstDayIndex; i++) {
            blanks.push(<div key={`blank-${i}`} style={{ width: '32px', height: '32px' }} />);
        }

        const daysInMonthElements = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const isSelected = selectedDateObj && selectedDateObj.getDate() === d && selectedDateObj.getMonth() === month && selectedDateObj.getFullYear() === year;
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

            let bgColor = 'transparent';
            let color = 'var(--text-main)';
            let fontWeight = 'normal';

            if (isSelected) {
                bgColor = 'var(--primary)';
                color = 'var(--primary-fg)';
                fontWeight = 'bold';
            } else if (isToday) {
                bgColor = 'rgba(255, 255, 255, 0.1)';
                fontWeight = 'bold';
            }

            daysInMonthElements.push(
                <div
                    key={`day-${d}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        selectDate(d);
                    }}
                    style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: bgColor,
                        color: color,
                        fontWeight: fontWeight,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = isToday ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
                    }}
                >
                    {d}
                </div>
            );
        }

        const totalSlots = [...blanks, ...daysInMonthElements];

        return (
            <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '280px',
                boxSizing: 'border-box',
                backgroundColor: '#1a1a1e',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                zIndex: 1100,
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                padding: '16px',
                animation: 'fade-in 0.2s ease',
                cursor: 'default'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {shortMonths[month]} {year}
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Weekdays */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
                    {weekDays.map((wd, i) => (
                        <div key={`wd-${i}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {wd}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                    {totalSlots}
                </div>

                {/* Today shortcut */}
                <div
                    style={{
                        marginTop: '16px',
                        textAlign: 'center',
                        color: 'var(--primary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange(formatDate(new Date()));
                        setIsOpen(false);
                    }}
                >
                    Hoje
                </div>
            </div>
        );
    };

    return (
        <div style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
            <div
                className="input-focus"
                style={{
                    width: '100%',
                    borderRadius: '12px',
                    border: '1px solid var(--card-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'var(--transition)',
                    overflow: 'hidden',
                    ...(isOpen ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 2px rgba(var(--primary-rgb), 0.2)' } : {}),
                    ...style
                }}
            >
                <input
                    type="text"
                    value={value || ''}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    onFocus={() => setIsOpen(true)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-main)',
                        outline: 'none',
                        fontSize: '1rem'
                    }}
                />
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        padding: '0 16px',
                        color: isOpen ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <CalendarIcon size={18} />
                </div>
            </div>

            {isOpen && renderCalendar()}
        </div>
    );
};

export default DatePicker;
