import React from 'react'

interface InfoWindowProps {
  name: string
}

/**
 * Renders the InfoWindow content for Naver Maps as HTML string.
 * Use ReactDOMServer.renderToString(<InfoWindow ... />) to get the HTML string for the native API.
 */
const InfoWindow: React.FC<InfoWindowProps> = ({ name }) => (
  <div className="naver-infowindow">
    {name}
    <div className="naver-infowindow-triangle"></div>
  </div>
)

export default InfoWindow
