escribe test exhautivos para: $ARGUMENTS

testing conventions:

- utiliza Vitests con react testing library
- colo losarchivos de prueba en un directorio **tests** en la misma carpeta que el source file
- los nombres de los test files deben ser [filename].test.ts(x)
- usa @/ prefix for imports

Coverage:

- Test happy paths
- Test cosos limites
- Test estados de error
- Concéntrese en probar el comportamiento y las API públicas en lugar de en los detalles de implementación.