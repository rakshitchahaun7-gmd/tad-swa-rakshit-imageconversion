import azure.functions as func
import logging
from PIL import Image
import io

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="process-image", methods=["POST"])
def process_image(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Processing image request.')

    try:
        # The frontend will send the raw image bytes in the request body
        image_bytes = req.get_body()
        if not image_bytes:
            return func.HttpResponse(
                 "Please provide an image in the request body.",
                 status_code=400
            )

        # Open the image using Pillow
        image = Image.open(io.BytesIO(image_bytes))
        
        # Example processing: Convert to grayscale and apply thumbnail sizing
        image = image.convert('L') # Convert to Grayscale
        image.thumbnail((1200, 1200)) # Resize if larger than 1200x1200 to save bandwidth
        
        # Save processed image to a byte stream as JPEG
        output_stream = io.BytesIO()
        image.save(output_stream, format="JPEG", quality=85)
        output_stream.seek(0)
        
        # Return the processed image
        return func.HttpResponse(
            body=output_stream.read(),
            mimetype="image/jpeg",
            status_code=200
        )
    except Exception as e:
        logging.error(f"Error processing image: {e}")
        return func.HttpResponse(
             f"Error processing image: {str(e)}",
             status_code=500
        )
