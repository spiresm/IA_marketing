exports.handler = async () => {
  try {
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    const data = JSON.parse(content);
    // ici data est supposé être un tableau directement
    return {
      statusCode: 200,
      body: JSON.stringify(Array.isArray(data) ? data : []),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lecture fichier', details: error.message }),
    };
  }
};
