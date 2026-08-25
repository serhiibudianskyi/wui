export const fileFieldTranslations = {
    en: {
        fileTooLarge: (fileName: string, sizeMB: string, maxSizeMB: string) => `File '${fileName}' is too large (${sizeMB}MB). Maximum allowed size is ${maxSizeMB}MB. ${fileName} blocked`,
        maxFiles: (maxFiles: number, fileName: string) => `Max files limit reached (${maxFiles}): ${fileName} blocked`,
        duplicateFile: (fileName: string) => `Duplicate file blocked: ${fileName}`,
        failed: 'Upload failed',
        cancelled: 'Upload cancelled',
    },
    uk: {
        fileTooLarge: (fileName: string, sizeMB: string, maxSizeMB: string) => `Файл '${fileName}' занадто великий (${sizeMB}МБ). Максимально допустимий розмір - ${maxSizeMB}МБ. ${fileName} заблоковано`,
        maxFiles: (maxFiles: number, fileName: string) => `Досягнуто ліміт файлів (${maxFiles}): ${fileName} заблоковано`,
        duplicateFile: (fileName: string) => `Дубльований файл заблоковано: ${fileName}`,
        failed: 'Помилка завантаження',
        cancelled: 'Завантаження скасовано',
    },
    ru: {
        fileTooLarge: (fileName: string, sizeMB: string, maxSizeMB: string) => `Файл '${fileName}' слишком большой (${sizeMB}МБ). Максимально допустимый размер - ${maxSizeMB}МБ. ${fileName} заблокирован`,
        maxFiles: (maxFiles: number, fileName: string) => `Достигнут лимит файлов (${maxFiles}): ${fileName} заблокирован`,
        duplicateFile: (fileName: string) => `Дублированный файл заблокирован: ${fileName}`,
        failed: 'Ошибка загрузки',
        cancelled: 'Загрузка отменена',
    }
};