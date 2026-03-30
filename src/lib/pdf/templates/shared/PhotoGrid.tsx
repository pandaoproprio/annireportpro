import React from 'react'
import { View, Image, Text } from '@react-pdf/renderer'
import { styles } from './styles'
import type { ReportPhoto } from '../../schema'

interface PhotoGridProps {
  photos: ReportPhoto[]
}

export function PhotoGrid({ photos }: PhotoGridProps) {
  if (!photos || photos.length === 0) return null

  return (
    <View style={styles.photoGrid} wrap={true}>
      {photos.map((photo, index) => (
        <View key={index} style={styles.photoCell} wrap={false}>
          <Image
            src={photo.base64 ?? photo.url}
            style={styles.photoImage}
          />
          {photo.caption && (
            <Text style={styles.photoCaption}>{photo.caption}</Text>
          )}
        </View>
      ))}
    </View>
  )
}
