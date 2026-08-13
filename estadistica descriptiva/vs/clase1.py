# Importar librería
import pandas as pd

# Crear una Serie de temperaturas
temperaturas = pd.Series([20, 22, 19, 25, 23, 21])
print("Serie de Temperaturas: ", temperaturas)

# Acceder a un elemento por su índice
print(f'\nTemperatura del día 0: {temperaturas[0]}')

# Generamos una Serie de preferencia de sabores
Sabores = pd.Series([5, 4, 2, 1, 8],
                    ['Piña', 'Chocolate', 'Naranja', 'Menta', 'Otros'])

print(Sabores)

Ingl = pd.Series(['Pineapple', 'Chocolate', 'Orange', 'Mint', 'Other'],
 ['Piña', 'Chocolate', 'Naranja', 'Menta', 'Otros'])

TABLA = pd.DataFrame({
    'Cantidad de personas': Sabores, #primera columna
    'Nombre en inglés': Ingl, #segunda columna
})

TABLA