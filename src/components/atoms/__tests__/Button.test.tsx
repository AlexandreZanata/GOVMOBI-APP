import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {ThemeProvider} from '@theme/index';
import {Button} from '../Button';

describe('Button', () => {
  it('renders label', () => {
    const {getByText} = render(
      <ThemeProvider>
        <Button label="Save" testID="button" />
      </ThemeProvider>,
    );

    expect(getByText('Save')).toBeTruthy();
  });

  it('calls onPress when enabled', () => {
    const onPress = jest.fn();

    const {getByTestId} = render(
      <ThemeProvider>
        <Button label="Save" onPress={onPress} testID="button" />
      </ThemeProvider>,
    );

    fireEvent.press(getByTestId('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    const {queryByText, getByTestId} = render(
      <ThemeProvider>
        <Button label="Save" loading testID="button" />
      </ThemeProvider>,
    );

    expect(queryByText('Save')).toBeNull();
    expect(getByTestId('button').props.accessibilityRole).toBe('button');
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();

    const {getByTestId} = render(
      <ThemeProvider>
        <Button disabled label="Save" onPress={onPress} testID="button" />
      </ThemeProvider>,
    );

    fireEvent.press(getByTestId('button'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
