const cloudinary = require('cloudinary').v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function upload(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'alaffia',
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          ...(options.transformation || []),
        ],
        ...options,
      },
      (err, result) => {
        if (err) reject(err)
        else resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
}

function url(publicId, transformations = []) {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    transformation,
  })
}

function uploadFromUrl(imageUrl, options = {}) {
  return cloudinary.uploader.upload(imageUrl, {
    folder: options.folder || 'alaffia',
    resource_type: 'image',
    quality: 'auto',
    fetch_format: 'auto',
    ...options,
  })
}

module.exports = { cloudinary, upload, url, uploadFromUrl }
