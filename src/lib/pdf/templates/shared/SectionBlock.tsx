import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { styles } from './styles'
import { PhotoGrid } from './PhotoGrid'
import type { ReportSection } from '../../schema'

interface SectionBlockProps {
  section: ReportSection
  level?: number
}

export function SectionBlock({ section, level = 0 }: SectionBlockProps) {
  const titleStyle = level === 0 ? styles.sectionTitle : styles.subsectionTitle

  return (
    <View wrap={false} style={{ marginBottom: 4 }}>
      <Text style={titleStyle}>{section.title}</Text>

      {section.content && (
        <Text style={styles.paragraph}>{section.content}</Text>
      )}

      {section.photos && section.photos.length > 0 && (
        <PhotoGrid photos={section.photos} />
      )}

      {section.subsections?.map((sub) => (
        <SectionBlock key={sub.id} section={sub} level={level + 1} />
      ))}
    </View>
  )
}
