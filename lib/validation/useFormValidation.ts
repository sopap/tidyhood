import { useState, useCallback } from 'react'
import { z } from 'zod'

interface ValidationState {
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValidating: boolean
}

export function useFormValidation<T extends z.ZodType>(schema: T) {
  const [state, setState] = useState<ValidationState>({
    errors: {},
    touched: {},
    isValidating: false,
  })

  const validateField = useCallback(async (
    fieldName: string,
    value: any,
    allValues?: any
  ) => {
    try {
      // For nested fields like address.zip
      const fieldPath = fieldName.split('.')
      let fieldSchema: any = schema
      
      // Navigate to the nested field schema
      for (const path of fieldPath) {
        if (fieldSchema._def?.shape) {
          fieldSchema = fieldSchema._def.shape()[path]
        }
      }

      // Validate the field
      await fieldSchema.parseAsync(value)
      
      // Clear error if valid
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, [fieldName]: '' },
      }))
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors[0]?.message || 'Invalid value'
        setState(prev => ({
          ...prev,
          errors: { ...prev.errors, [fieldName]: fieldError },
        }))
        return false
      }
      return false
    }
  }, [schema])

  const validateForm = useCallback(async (values: any) => {
    setState(prev => ({ ...prev, isValidating: true }))
    
    try {
      await schema.parseAsync(values)
      setState(prev => ({
        ...prev,
        errors: {},
        isValidating: false,
      }))
      return { success: true, data: values }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMap: Record<string, string> = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          errorMap[path] = err.message
        })
        setState(prev => ({
          ...prev,
          errors: errorMap,
          isValidating: false,
        }))
        return { success: false, errors: errorMap }
      }
      setState(prev => ({ ...prev, isValidating: false }))
      return { success: false, errors: {} }
    }
  }, [schema])

  const setFieldTouched = useCallback((fieldName: string) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [fieldName]: true },
    }))
  }, [])

  const clearError = useCallback((fieldName: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [fieldName]: '' },
    }))
  }, [])

  return {
    errors: state.errors,
    touched: state.touched,
    isValidating: state.isValidating,
    validateField,
    validateForm,
    setFieldTouched,
    clearError,
  }
}
