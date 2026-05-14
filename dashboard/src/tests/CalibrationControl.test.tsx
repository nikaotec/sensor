import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import CalibrationControl from '../components/device/CalibrationControl';

test('renders sensor selection buttons and allows selecting PT100', () => {
    const setTempSensor = vi.fn();
    const handleCalibration = vi.fn();

    const props = {
        voltCalibration: '',
        setVoltCalibration: vi.fn(),
        batCalibration: '',
        setBatCalibration: vi.fn(),
        tempCalibration: '25.0',
        setTempCalibration: vi.fn(),
        handleCalibration,
        isUpdating: false,
        isConnected: true,
        // @ts-ignore - Propositalmente ignorando erro de tipo até a implementação
        tempSensor: 'DS18B20' as const,
        // @ts-ignore
        setTempSensor
    };

    render(<CalibrationControl {...props} />);

    // Verifica se os botões existem (usando texto ou roles)
    const dsButton = screen.getByText(/DS18B20/i);
    const ptButton = screen.getByText(/PT100/i);

    expect(dsButton).toBeInTheDocument();
    expect(ptButton).toBeInTheDocument();

    // Simula clique no PT100
    fireEvent.click(ptButton);
    expect(setTempSensor).toHaveBeenCalledWith('PT100');
});
