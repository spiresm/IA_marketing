export const handler = async (event) => {
  console.log("Proxy appelé avec event :", event);
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ message: "Proxy fonctionne !" }),
  };
};
